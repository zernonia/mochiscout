import type { Llm } from '@mochiscout/llm'
import type { JobContext } from '../jobs/context'
import { and, asc, eq, inArray, schema } from '@mochiscout/db'
import type { ScoringExamples } from '../leads/learning'
import { LlmParseError, LlmRefusalError, z } from '@mochiscout/llm'
import { stateFromAge } from '@mochiscout/sources'
import { scoringExamples, scoringExamplesBrief } from '../leads/learning'
import { isMakerPost } from './prefilter'
import { recordUsage } from '../usage'

export const SCORE_BATCH = 20
/** LLM calls per cron tick; the rest of the queue waits for the next tick. */
const MAX_BATCHES_PER_RUN = 5

const KINDS = ['seeking_tool', 'comparison', 'complaint', 'pain', 'other'] as const

export const ScoreBatch = z.object({
  scores: z.array(z.object({
    id: z.number().int().describe('The thread number given in the input'),
    intent: z.number().int().describe('0-100 buying intent for this product, per the rubric'),
    kind: z.enum(KINDS),
    reason: z.string().describe('One sentence: why this score'),
    reply_angle: z.string().describe('One sentence: how to reply helpfully. Help first; mention the product only if it genuinely fits.'),
  })),
})

export interface ScoringProject {
  name: string
  url: string
  category: string | null
  icp: string | null
  problems: string[]
  competitors: string[]
}

export interface ScoringThread {
  platform?: string
  channel: string | null
  title: string
  snippet: string | null
  /** 'search' when the thread came from a web search result rather than the platform's own feed. */
  source?: string
}

/** Highest intent for a post whose title says the poster made the thing ("I built…", "Show HN:"). */
export const MAKER_POST_MAX_INTENT = 25

export function scoringSystemPrompt(p: ScoringProject, examples?: ScoringExamples) {
  return `You find threads and posts (Reddit, Hacker News, Bluesky, X) where a founder could genuinely help someone, and where their product may be relevant. You never write the reply yourself.

Product: ${p.name} (${p.url})
Category: ${p.category ?? 'unknown'}
Who buys it: ${p.icp ?? 'unknown'}
Problems it solves: ${p.problems.join('; ') || 'unknown'}
Competitors: ${p.competitors.join(', ') || 'unknown'}

For each thread, return:
- intent (0-100):
  80-100: the poster is looking for a solution like this product right now (asking for a tool, alternatives, or recommendations).
  60-79: clear pain or a comparison where a helpful reply that mentions this product would be welcome.
  30-59: related topic, weak or indirect need.
  0-29: unrelated, or the poster is promoting their own product, hiring, or selling.
- Self-promotion is never a lead, however close the topic. Score 0-20 when the poster made, built, launched or sells the thing they describe: "I made/built/created X", "so I made a free…", "Show HN", "introducing X", a title that names and pitches a product, asking for feedback or beta testers on their own app, or a frustration story that ends with what they built ("I got so frustrated… so I built…"). The founder can't sell to another maker showing off their own app.
- Judge the poster's own words. Text marked as a search snippet can include titles of other, related threads from the same page ("Any free alternatives to X?"); never score a thread on those.
- kind: seeking_tool (asks for a tool or service), comparison (weighs named products), complaint (about a specific product), pain (describes the problem without asking for tools), other.
- reason: one sentence.
- reply_angle: one sentence on how to help in a reply.
${scoringExamplesBrief(examples)}
Score every thread exactly once, using its number as id.`
}

const PLATFORM_LABEL: Record<string, string> = { hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web' }

function snippetLine(t: ScoringThread) {
  if (!t.snippet) return ''
  return t.source === 'search' ? `[search snippet] ${t.snippet}` : t.snippet
}

function sourceLabel(t: ScoringThread) {
  if (t.channel) return `r/${t.channel} · `
  return t.platform && PLATFORM_LABEL[t.platform] ? `${PLATFORM_LABEL[t.platform]} · ` : ''
}

export function scoringUserPrompt(threads: ScoringThread[]) {
  return threads
    .map((t, i) => `<thread id="${i + 1}">\n${sourceLabel(t)}${t.title}\n${snippetLine(t)}\n</thread>`)
    .join('\n\n')
}

export async function scoreThreads(llm: Llm, project: ScoringProject, threads: ScoringThread[], examples?: ScoringExamples) {
  const res = await llm.generate({
    tier: 'fast',
    system: scoringSystemPrompt(project, examples),
    prompt: scoringUserPrompt(threads),
    schema: ScoreBatch,
    maxTokens: 8000,
  })
  const byIndex = new Map<number, z.infer<typeof ScoreBatch>['scores'][number]>()
  for (const s of res.data.scores) {
    if (s.id >= 1 && s.id <= threads.length && !byIndex.has(s.id)) byIndex.set(s.id, s)
  }
  return {
    usage: res.usage,
    scores: threads.map((t, i) => {
      const s = byIndex.get(i + 1)
      if (!s) return null
      const intent = Math.max(0, Math.min(100, Math.round(s.intent)))
      if (isMakerPost(t.title) && intent > MAKER_POST_MAX_INTENT) {
        return { ...s, intent: MAKER_POST_MAX_INTENT, kind: 'other' as const, reason: 'The poster is sharing something they made, not asking for one.' }
      }
      return { ...s, intent }
    }),
  }
}

/** Drain the score queue in batches of 20 threads per project per LLM call. */
export async function runScoring(ctx: JobContext, opts: { maxBatches?: number, projectId?: string } = {}) {
  if (!ctx.llm) return { skipped: 'no LLM configured' }
  const maxBatches = opts.maxBatches ?? MAX_BATCHES_PER_RUN
  let batches = 0
  let scored = 0
  let dropped = 0

  while (batches < maxBatches) {
    // One project only (e.g. right after onboarding), or whichever queued first.
    const next = await ctx.db
      .select({ projectId: schema.scoreQueue.projectId })
      .from(schema.scoreQueue)
      .where(opts.projectId ? eq(schema.scoreQueue.projectId, opts.projectId) : undefined)
      .orderBy(asc(schema.scoreQueue.queuedAt))
      .limit(1)
      .get()
    if (!next) break

    const project = await ctx.db.select().from(schema.projects).where(eq(schema.projects.id, next.projectId)).get()
    const items = await ctx.db
      .select({
        threadId: schema.threads.id,
        platform: schema.threads.platform,
        channel: schema.threads.channel,
        title: schema.threads.title,
        snippet: schema.threads.snippet,
        createdUtc: schema.threads.createdUtc,
        state: schema.threads.state,
        source: schema.threads.source,
      })
      .from(schema.scoreQueue)
      .innerJoin(schema.threads, eq(schema.threads.id, schema.scoreQueue.threadId))
      .where(eq(schema.scoreQueue.projectId, next.projectId))
      .orderBy(asc(schema.scoreQueue.queuedAt))
      .limit(SCORE_BATCH)
    batches++

    const dequeue = () => ctx.db.delete(schema.scoreQueue).where(and(
      eq(schema.scoreQueue.projectId, next.projectId),
      inArray(schema.scoreQueue.threadId, items.map(i => i.threadId)),
    ))

    if (!project || items.length === 0) {
      // Project deleted or threads pruned: clear the stale rows.
      await ctx.db.delete(schema.scoreQueue).where(eq(schema.scoreQueue.projectId, next.projectId))
      continue
    }

    // Threads nobody can reply to any more (archived, removed) are not leads: skip the LLM call.
    const now = ctx.now()
    const open = items.filter(i => i.state === 'open' && !stateFromAge(i.platform, i.createdUtc, now, i.threadId))
    if (open.length === 0) {
      await dequeue()
      dropped += items.length
      continue
    }

    let result: Awaited<ReturnType<typeof scoreThreads>>
    try {
      result = await scoreThreads(ctx.llm, project, open, await scoringExamples(ctx.db, project.id))
    }
    catch (error) {
      // A batch the model refuses or cannot answer would block the queue forever: drop it.
      if (error instanceof LlmRefusalError || error instanceof LlmParseError) {
        ctx.log('scoring batch dropped', { project: project.id, threads: items.length, error: String(error) })
        await dequeue()
        dropped += items.length
        continue
      }
      ctx.log('scoring failed', { project: project.id, error: String(error) })
      break
    }

    const inserts = open.flatMap((item, i) => {
      const s = result.scores[i]
      if (!s) return []
      return [ctx.db.insert(schema.threadScores).values({
        projectId: project.id,
        threadId: item.threadId,
        intent: s.intent,
        kind: s.kind,
        reason: s.reason,
        replyAngle: s.reply_angle,
      }).onConflictDoNothing()]
    })
    const statements = [...inserts, dequeue()]
    await ctx.db.batch(statements as [typeof statements[number], ...typeof statements])
    await recordUsage(ctx.db, project.orgId, {
      llmInputTokens: result.usage.inputTokens,
      llmOutputTokens: result.usage.outputTokens,
    })
    scored += inserts.length
    dropped += items.length - inserts.length
  }

  ctx.log('scoring', { batches, scored, dropped })
  return { batches, scored, dropped }
}
