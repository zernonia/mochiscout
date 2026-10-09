import type { Db } from '@mochiscout/db'
import type { Http, ThreadContext } from '@mochiscout/sources'
import type { JobContext } from '../jobs/context'
import { and, desc, eq, gte, inArray, isNull, lt, or, schema, sql } from '@mochiscout/db'
import { fetchThreadContext, HttpDeferredError } from '@mochiscout/sources'

/** Context younger than this is reused when drafting. */
export const CONTEXT_FRESH_MS = 30 * 60_000
/** Open threads under 3 days old are re-checked this often in the background. */
const RECHECK_MS = 12 * 3_600_000
const RECHECK_WINDOW_MS = 3 * 86_400_000
/** Background checks per cron tick (Reddit reads are rate-limited). */
const CHECKS_PER_RUN = 8

type ThreadRow = typeof schema.threads.$inferSelect

/** Store what a context fetch learned about a thread. */
async function saveContext(db: Db, thread: ThreadRow, ctx: ThreadContext, now: Date) {
  const engagement = { ...(thread.engagement as Record<string, number> | null ?? {}) }
  if (ctx.commentCount !== null && engagement.comments === undefined && engagement.replies === undefined) {
    engagement.comments = ctx.commentCount
  }
  const update = {
    state: ctx.state,
    body: ctx.body ?? thread.body,
    comments: ctx.comments.length ? ctx.comments : thread.comments,
    createdUtc: thread.createdUtc ?? ctx.createdAt,
    engagement,
    contextFetchedAt: now,
  }
  await db.update(schema.threads).set(update).where(eq(schema.threads.id, thread.id))
  return { ...thread, ...update }
}

/**
 * Fetch a thread's full text, top comments and reply state when the stored
 * copy is stale. Failures (rate limits, network) keep what we have: drafting
 * still works from the title and snippet.
 */
export async function refreshThreadContext(db: Db, http: Http, threadId: string, opts: { now?: Date, maxAgeMs?: number, throwOnDefer?: boolean, log?: JobContext['log'] } = {}) {
  const now = opts.now ?? new Date()
  const thread = await db.select().from(schema.threads).where(eq(schema.threads.id, threadId)).get()
  if (!thread) return null
  const fresh = thread.contextFetchedAt && now.getTime() - thread.contextFetchedAt.getTime() < (opts.maxAgeMs ?? CONTEXT_FRESH_MS)
  if (fresh || thread.state !== 'open') return thread
  try {
    const ctx = await fetchThreadContext(http, { id: thread.id, platform: thread.platform, channel: thread.channel, createdAt: thread.createdUtc }, now)
    return ctx ? await saveContext(db, thread, ctx, now) : thread
  }
  catch (error) {
    if (error instanceof HttpDeferredError && opts.throwOnDefer) throw error
    opts.log?.('thread context failed', { thread: threadId, error: String(error) })
    return thread
  }
}

/**
 * Cron: check the reply state and context of new inbox threads, highest
 * intent first, so archived or removed posts are flagged before anyone
 * spends time (or a draft) on them.
 */
export async function runLeadChecks(ctx: JobContext) {
  const now = ctx.now()
  const t = schema.threads
  const s = schema.threadScores
  const platforms: ThreadRow['platform'][] = ctx.readMode && ctx.readMode !== 'server' ? ['hn', 'bluesky'] : ['reddit', 'hn', 'bluesky']
  const candidates = await ctx.db
    .select({ id: t.id })
    .from(s)
    .innerJoin(t, eq(t.id, s.threadId))
    .innerJoin(schema.projects, eq(schema.projects.id, s.projectId))
    .where(and(
      eq(s.status, 'new'),
      gte(s.intent, schema.projects.intentThreshold),
      eq(t.state, 'open'),
      inArray(t.platform, platforms),
      or(
        isNull(t.contextFetchedAt),
        and(
          lt(t.contextFetchedAt, new Date(now.getTime() - RECHECK_MS)),
          gte(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`, Math.floor((now.getTime() - RECHECK_WINDOW_MS) / 1000)),
        ),
      ),
    ))
    .orderBy(desc(sql`${t.contextFetchedAt} is null`), desc(s.intent))
    .limit(CHECKS_PER_RUN)

  const result = { checked: 0, closed: 0, deferred: false }
  // A thread scored by several projects appears once per project.
  for (const id of new Set(candidates.map(c => c.id))) {
    try {
      const thread = await refreshThreadContext(ctx.db, ctx.http, id, { now, maxAgeMs: 0, throwOnDefer: true, log: ctx.log })
      result.checked++
      if (thread && thread.state !== 'open') result.closed++
    }
    catch (error) {
      if (!(error instanceof HttpDeferredError)) throw error
      result.deferred = true
      break
    }
  }
  ctx.log('lead-checks', result)
  return result
}
