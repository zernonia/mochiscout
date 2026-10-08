import type { DiscoveryMode } from '../search/queries'
import type { JobContext } from './context'
import { eq, inArray, schema } from '@social-radar/db'
import { cleanRedditTitle, HttpDeferredError, parseRedditThreadUrl, SNIPPET_MAX, truncate } from '@social-radar/sources'
import { queueSearchThreads } from '../scoring/queue'
import { buildDiscoveryQueries } from '../search/queries'

export interface DiscoveryResult {
  queries: number
  /** New thread ids per project (input for scoring). */
  newThreadIds: Record<string, string[]>
  deferred?: boolean
}

/** Run search-provider queries per project and upsert the Reddit threads found (source=search). */
export async function runDiscovery(
  ctx: JobContext,
  opts: { projectIds?: string[] } = {},
): Promise<DiscoveryResult | { skipped: string }> {
  if (!ctx.search) return { skipped: 'no search provider configured' }

  const projects = opts.projectIds
    ? await ctx.db.select().from(schema.projects).where(inArray(schema.projects.id, opts.projectIds))
    : await ctx.db.select().from(schema.projects)
  const result: DiscoveryResult = { queries: 0, newThreadIds: {} }

  for (const project of projects) {
    const found: string[] = []
    for (const q of buildDiscoveryQueries(project)) {
      try {
        const res = await ctx.search.search(q.search)
        result.queries++
        found.push(...await upsertSearchResults(ctx, res.results, q.mode))
      }
      catch (error) {
        if (error instanceof HttpDeferredError) {
          ctx.log('discovery deferred', { project: project.id, retryAt: new Date(error.retryAt).toISOString() })
          result.deferred = true
          result.newThreadIds[project.id] = found
          await queueSearchThreads(ctx, project.id, [...new Set(found)])
          return result
        }
        ctx.log('discovery query failed', { project: project.id, query: q.search.query, error: String(error) })
      }
    }
    result.newThreadIds[project.id] = [...new Set(found)]
    await queueSearchThreads(ctx, project.id, result.newThreadIds[project.id]!)
  }
  ctx.log('discovery', { queries: result.queries, projects: projects.length })
  return result
}

/** Insert unseen threads; mark already-known ones as ranking in search when found by an evergreen query. */
async function upsertSearchResults(
  ctx: JobContext,
  results: { title: string, url: string, snippet: string }[],
  mode: DiscoveryMode,
): Promise<string[]> {
  const rows = new Map<string, typeof schema.threads.$inferInsert>()
  for (const r of results) {
    const ref = parseRedditThreadUrl(r.url)
    if (!ref || rows.has(ref.id)) continue
    rows.set(ref.id, {
      id: ref.id,
      platform: 'reddit',
      channel: ref.subreddit,
      title: cleanRedditTitle(r.title),
      url: ref.url,
      snippet: r.snippet ? truncate(r.snippet, SNIPPET_MAX) : null,
      source: 'search',
      searchRankFlag: mode === 'evergreen',
    })
  }
  if (rows.size === 0) return []

  const ids = [...rows.keys()]
  const existing = new Set(
    (await ctx.db.select({ id: schema.threads.id }).from(schema.threads).where(inArray(schema.threads.id, ids)))
      .map(r => r.id),
  )
  const fresh = ids.filter(id => !existing.has(id))

  const statements = [
    ...fresh.map(id => ctx.db.insert(schema.threads).values(rows.get(id)!).onConflictDoNothing()),
    ...(mode === 'evergreen'
      ? [...existing].map(id =>
          ctx.db.update(schema.threads).set({ searchRankFlag: true }).where(eq(schema.threads.id, id)))
      : []),
  ]
  if (statements.length) await ctx.db.batch(statements as [typeof statements[number], ...typeof statements])
  return fresh
}
