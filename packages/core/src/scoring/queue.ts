import type { JobContext } from '../jobs/context'
import { and, eq, inArray, schema } from '@social-radar/db'
import { createMatcher } from './prefilter'

/** D1 allows 100 bound parameters per statement. */
const ID_CHUNK = 90

function chunks<T>(items: T[], size = ID_CHUNK) {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function enqueue(ctx: JobContext, rows: { projectId: string, threadId: string, matched: string[] }[]) {
  const statements = rows.map(r => ctx.db.insert(schema.scoreQueue).values(r).onConflictDoNothing())
  for (const batch of chunks(statements, 50)) {
    if (batch.length) await ctx.db.batch(batch as [typeof batch[number], ...typeof batch])
  }
  return rows.length
}

/** Prefilter new RSS threads against every project watching their subreddit. */
export async function queueRssThreads(ctx: JobContext, threadIds: string[]) {
  if (threadIds.length === 0) return 0
  const threads = (await Promise.all(chunks(threadIds).map(ids =>
    ctx.db
      .select({ id: schema.threads.id, channel: schema.threads.channel, title: schema.threads.title, snippet: schema.threads.snippet })
      .from(schema.threads)
      .where(inArray(schema.threads.id, ids)),
  ))).flat()

  const channels = [...new Set(threads.map(t => t.channel).filter((c): c is string => !!c))]
  if (channels.length === 0) return 0
  const watchers = (await Promise.all(chunks(channels).map(names =>
    ctx.db
      .select({
        subreddit: schema.projectSubreddits.subreddit,
        id: schema.projects.id,
        category: schema.projects.category,
        keywords: schema.projects.keywords,
        competitors: schema.projects.competitors,
      })
      .from(schema.projectSubreddits)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.projectSubreddits.projectId))
      .where(and(eq(schema.projectSubreddits.watching, true), inArray(schema.projectSubreddits.subreddit, names))),
  ))).flat()

  const matchers = new Map(watchers.map(w => [w.id, createMatcher(w)]))
  const rows: { projectId: string, threadId: string, matched: string[] }[] = []
  for (const thread of threads) {
    for (const w of watchers.filter(w => w.subreddit === thread.channel)) {
      const matched = matchers.get(w.id)!(`${thread.title}\n${thread.snippet ?? ''}`)
      if (matched.length) rows.push({ projectId: w.id, threadId: thread.id, matched })
    }
  }
  return enqueue(ctx, rows)
}

/** Threads found by a project's own searches skip the prefilter. */
export async function queueSearchThreads(ctx: JobContext, projectId: string, threadIds: string[], matched = ['search']) {
  return enqueue(ctx, threadIds.map(threadId => ({ projectId, threadId, matched })))
}
