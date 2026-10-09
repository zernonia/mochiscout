import type { Platform, Post, SourceAdapter } from '@mochiscout/sources'
import type { JobContext } from './context'
import { eq, inArray, schema } from '@mochiscout/db'
import { HttpDeferredError } from '@mochiscout/sources'
import { PLANS } from '../plans'
import { queueSearchThreads } from '../scoring/queue'

/** Terms queried per source per project per run; the rest rotate through later runs. */
export const TERMS_PER_RUN = 6
/** Overlap window so posts indexed late are still caught (duplicates are ignored). */
const LOOKBACK_MS = 2 * 86_400_000

/** The slice of terms to query this hour, rotating so every term gets its turn. */
export function termsForRun(terms: string[], runIndex: number, perRun = TERMS_PER_RUN) {
  if (terms.length <= perRun) return terms
  const start = (runIndex * perRun) % terms.length
  return Array.from({ length: perRun }, (_, i) => terms[(start + i) % terms.length]!)
}

export function projectTerms(project: { searchTerms: string[], keywords: string[], competitors: string[] }) {
  const terms = project.searchTerms.length ? project.searchTerms : [...project.keywords, ...project.competitors]
  return [...new Set(terms.map(t => t.trim()).filter(Boolean))]
}

/** Insert unseen posts; returns the ids that were new. */
export async function upsertPosts(ctx: JobContext, posts: Post[], source: 'api' | 'search' | 'extension') {
  const unique = [...new Map(posts.map(p => [p.id, p])).values()]
  if (!unique.length) return []
  const existing = new Set((await ctx.db.select({ id: schema.threads.id }).from(schema.threads)
    .where(inArray(schema.threads.id, unique.map(p => p.id)))).map(r => r.id))
  const fresh = unique.filter(p => !existing.has(p.id))
  const inserts = fresh.map(p => ctx.db.insert(schema.threads).values({
    id: p.id,
    platform: p.platform,
    channel: p.channel,
    title: p.title,
    url: p.url,
    author: p.author,
    createdUtc: p.createdAt,
    snippet: p.snippet,
    engagement: p.engagement ?? null,
    source,
  }).onConflictDoNothing())
  for (let i = 0; i < inserts.length; i += 50) {
    const batch = inserts.slice(i, i + 50)
    await ctx.db.batch(batch as [typeof batch[number], ...typeof batch])
  }
  return fresh.map(p => p.id)
}

/**
 * Hourly: search each project's terms on its enabled feed sources (HN,
 * Bluesky, X) and queue new posts for intent scoring.
 */
export async function runFeedDiscovery(ctx: JobContext & { adapters?: Partial<Record<Platform, SourceAdapter>> }) {
  const adapters = ctx.adapters ?? {}
  if (!Object.keys(adapters).length) return { skipped: 'no feed sources configured' }

  const now = ctx.now()
  const since = new Date(now.getTime() - LOOKBACK_MS)
  const runIndex = Math.floor(now.getTime() / 3_600_000)
  const projects = await ctx.db.select({ project: schema.projects, plan: schema.orgs.plan })
    .from(schema.projects)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.projects.orgId))

  const result = { queries: 0, newPosts: 0, deferred: false }
  outer: for (const { project, plan } of projects) {
    const allowed = new Set(PLANS[plan].sources)
    const terms = termsForRun(projectTerms(project), runIndex)
    for (const sourceId of project.sources) {
      const adapter = adapters[sourceId]
      if (!adapter || !allowed.has(sourceId)) continue
      for (const term of terms) {
        try {
          const posts = await adapter.search(term, since)
          result.queries++
          const fresh = await upsertPosts(ctx, posts, 'api')
          await queueSearchThreads(ctx, project.id, fresh, [`${sourceId}: ${term}`])
          result.newPosts += fresh.length
        }
        catch (error) {
          if (error instanceof HttpDeferredError) {
            result.deferred = true
            break outer
          }
          ctx.log('feed search failed', { source: sourceId, term, error: String(error) })
        }
      }
    }
  }
  ctx.log('feeds', result)
  return result
}
