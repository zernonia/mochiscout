import type { Llm } from '@mochiscout/llm'
import type { JobContext } from '../jobs/context'
import { and, desc, eq, gte, inArray, schema, sql } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { cleanRedditTitle, HttpDeferredError, parseRedditThreadUrl } from '@mochiscout/sources'
import { upsertSearchResults } from '../jobs/discovery'
import { PLANS } from '../plans'
import { recordUsage } from '../usage'

const MAX_THREADS = 60
const MAX_SEARCHES = 6
const SNIPPET_CHARS = 400

export const PainPointClusters = z.object({
  pain_points: z.array(z.object({
    title: z.string().describe('Short name for the pain, in the words buyers use'),
    summary: z.string().describe('Two or three sentences: what hurts, who feels it, what they have tried'),
    severity: z.number().int().describe('1 (mild annoyance) to 5 (costs money or time every week, people actively seek a fix)'),
    evidence: z.array(z.object({
      n: z.number().int().describe('Number of a snippet in the input'),
      paraphrase: z.string().describe('One-line paraphrase of what that snippet says about this pain'),
    })).describe('2-6 supporting snippets'),
  })).describe('5-15 distinct pain points, most severe first'),
})

export interface ResearchSnippet {
  threadId: string
  channel: string | null
  title: string
  text: string
  url: string
}

export interface ResearchProject {
  name: string
  category: string | null
  icp: string | null
  problems: string[]
}

export async function clusterPainPoints(llm: Llm, project: ResearchProject, snippets: ResearchSnippet[]) {
  const system = `You analyse what people on Reddit say to find the pain points behind them, for the founder of ${project.name}${project.category ? ` (${project.category})` : ''}.
Group the snippets into 5-15 distinct pain points. Use the buyers' own language, not marketing language. Only cite snippet numbers that appear in the input, and only snippets that really show the pain. Skip snippets that are self-promotion. Pain points do not have to be ones the product solves.
${project.icp ? `Buyers: ${project.icp}` : ''}`
  const prompt = snippets
    .map((s, i) => `<snippet n="${i + 1}">\n${s.channel ? `r/${s.channel} · ` : ''}${s.title}\n${s.text.slice(0, SNIPPET_CHARS)}\n</snippet>`)
    .join('\n\n')

  const res = await llm.generate({ tier: 'fast', system, prompt, schema: PainPointClusters, maxTokens: 12000 })

  const points = res.data.pain_points.slice(0, 15).map((p) => {
    const evidence = [...new Map(p.evidence
      .filter(e => e.n >= 1 && e.n <= snippets.length)
      .map(e => [e.n, e])).values()]
      .map((e) => {
        const s = snippets[e.n - 1]!
        return { threadId: s.threadId, url: s.url, title: s.title, subreddit: s.channel, paraphrase: e.paraphrase }
      })
    const subreddits = [...new Set(evidence.map(e => e.subreddit).filter((x): x is string => !!x))]
    return {
      title: p.title,
      summary: p.summary,
      severity: Math.max(1, Math.min(5, Math.round(p.severity))),
      evidence,
      subreddits,
    }
  }).filter(p => p.evidence.length > 0)

  return { points, usage: res.usage }
}

/** Gather evidence for a project: its relevant scored threads, plus pain searches when a provider is set. */
export async function gatherResearchSnippets(ctx: JobContext, project: typeof schema.projects.$inferSelect) {
  const t = schema.threads
  const s = schema.threadScores
  const scored = await ctx.db
    .select({ threadId: t.id, channel: t.channel, title: t.title, snippet: t.snippet, url: t.url })
    .from(s)
    .innerJoin(t, eq(t.id, s.threadId))
    .where(and(
      eq(s.projectId, project.id),
      inArray(s.kind, ['pain', 'complaint', 'seeking_tool', 'comparison']),
      gte(s.intent, 30),
    ))
    .orderBy(desc(s.intent))
    .limit(MAX_THREADS)

  const snippets = new Map<string, ResearchSnippet>()
  for (const r of scored) {
    snippets.set(r.threadId, { threadId: r.threadId, channel: r.channel, title: r.title, text: r.snippet ?? '', url: r.url })
  }

  let searches = 0
  if (ctx.search) {
    const queries = [
      ...project.problems.slice(0, 4),
      ...(project.category ? [`${project.category} "frustrated" OR "hate" OR "wish there was"`] : []),
    ].slice(0, MAX_SEARCHES)
    for (const query of queries) {
      try {
        const res = await ctx.search.search({
          query,
          domains: ['reddit.com'],
          purpose: 'Find Reddit threads where people describe frustrations with a problem.',
        })
        searches++
        await upsertSearchResults(ctx, res.results, 'evergreen')
        for (const r of res.results) {
          const ref = parseRedditThreadUrl(r.url)
          if (ref && !snippets.has(ref.id) && snippets.size < MAX_THREADS + 30) {
            snippets.set(ref.id, { threadId: ref.id, channel: ref.subreddit, title: cleanRedditTitle(r.title), text: r.snippet, url: ref.url })
          }
        }
      }
      catch (error) {
        if (error instanceof HttpDeferredError) break
        ctx.log('research search failed', { query, error: String(error) })
      }
    }
  }
  return { snippets: [...snippets.values()], searches }
}

/** One research run: gather, cluster, store as a new run_id. */
export async function runResearch(ctx: JobContext, projectId: string) {
  if (!ctx.llm) return { skipped: 'no LLM configured' as const }
  const project = await ctx.db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get()
  if (!project) return { skipped: 'project not found' as const }

  const { snippets, searches } = await gatherResearchSnippets(ctx, project)
  if (snippets.length < 5) {
    await recordUsage(ctx.db, project.orgId, { searches })
    return { skipped: 'not enough threads yet' as const, snippets: snippets.length }
  }

  const { points, usage } = await clusterPainPoints(ctx.llm, project, snippets)
  const runId = crypto.randomUUID()
  const inserts = points.map(p => ctx.db.insert(schema.painPoints).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    title: p.title,
    summary: p.summary,
    severity: p.severity,
    evidence: p.evidence,
    subreddits: p.subreddits,
    runId,
  }))
  if (inserts.length) await ctx.db.batch(inserts as [typeof inserts[number], ...typeof inserts])
  await recordUsage(ctx.db, project.orgId, {
    searches,
    researchRuns: 1,
    llmInputTokens: usage.inputTokens,
    llmOutputTokens: usage.outputTokens,
  })
  ctx.log('research', { project: project.id, snippets: snippets.length, points: points.length, searches })
  return { runId, points: points.length, snippets: snippets.length }
}

/** Scheduled job: re-run research for projects whose latest run is older than their plan's interval (a few per tick). */
export async function runWeeklyResearch(ctx: JobContext, maxProjects = 2) {
  if (!ctx.llm) return { skipped: 'no LLM configured' }
  const nowS = Math.floor(ctx.now().getTime() / 1000)
  // Interval per plan in days; plans without automatic research are skipped.
  const intervalDays = sql`case ${schema.orgs.plan}
    ${sql.join(Object.entries(PLANS).map(([plan, l]) => sql`when ${plan} then ${l.researchEveryDays ?? -1}`), sql` `)}
    else -1 end`
  const due = await ctx.db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.projects.orgId))
    .where(sql`${intervalDays} > 0 and not exists (
      select 1 from ${schema.painPoints} p
      where p.project_id = ${schema.projects.id} and p.created_at > ${nowS} - ${intervalDays} * 86400
    )`)
    .limit(maxProjects)
  const results = []
  for (const p of due) results.push(await runResearch(ctx, p.id))
  return { projects: due.length, results }
}
