import type { JobContext } from '../jobs/context'
import { and, asc, eq, gte, isNull, lt, ne, or, schema, sql } from '@mochiscout/db'
import { HttpDeferredError, HttpError, parsePostStatus, postFeedUrl, userFeedUrl } from '@mochiscout/sources'

const TRACK_DAYS = 30
const ACCOUNT_RECHECK_MS = 12 * 3_600_000
/** A watched sub's RSS should list a post within this long; otherwise it was likely filtered. */
const LISTING_GRACE_MS = 30 * 60_000
const MAX_POSTS_PER_RUN = 10
const MAX_ACCOUNTS_PER_RUN = 3

type TrackedPost = typeof schema.trackedPosts.$inferSelect

/** Check one tracked post through its public comments feed. */
export async function checkTrackedPost(ctx: JobContext, post: TrackedPost) {
  const postId = post.threadId?.replace(/^reddit:t3_/, '')
  if (!postId || !post.subreddit) return null
  const now = ctx.now()

  let status: TrackedPost['status'] = 'unknown'
  let title = post.title
  let postedAt = post.postedAt
  try {
    const res = await ctx.http.getText(postFeedUrl(post.subreddit, postId))
    const parsed = res.status === 'ok' ? parsePostStatus(res.body, postId) : null
    if (parsed) {
      status = parsed.status === 'live' ? 'live' : 'removed'
      title = parsed.title ?? title
      postedAt = parsed.publishedAt ?? postedAt
    }
  }
  catch (error) {
    if (error instanceof HttpDeferredError) throw error
    // 404: removed, or the sub went private/banned. Either way the post is not visible.
    if (error instanceof HttpError && error.status === 404) status = 'removed'
    else ctx.log('tracker check failed', { post: post.id, error: String(error) })
  }

  // Visible on the post page but never listed in a watched sub's /new feed: likely caught by the spam filter.
  if (status === 'live' && postedAt && post.threadId) {
    const sub = await ctx.db.select({ lastRssAt: schema.subreddits.lastRssAt }).from(schema.subreddits)
      .where(eq(schema.subreddits.name, post.subreddit)).get()
    if (sub?.lastRssAt && sub.lastRssAt.getTime() > postedAt.getTime() + LISTING_GRACE_MS) {
      const seen = await ctx.db.select({ id: schema.threads.id }).from(schema.threads)
        .where(and(eq(schema.threads.id, post.threadId), eq(schema.threads.source, 'rss'))).get()
      if (!seen) status = 'not_listed'
    }
  }

  await ctx.db.update(schema.trackedPosts)
    .set({ status, title, postedAt, lastCheckedAt: now })
    .where(eq(schema.trackedPosts.id, post.id))
  return status
}

/** Check a Reddit username's public profile: missing means suspended, shadowbanned or deleted. */
export async function checkRedditAccount(ctx: JobContext, userId: string, username: string) {
  let status: 'ok' | 'not_found' | 'unknown' = 'unknown'
  try {
    const res = await ctx.http.getText(userFeedUrl(username))
    status = res.status === 'ok' ? 'ok' : 'unknown'
  }
  catch (error) {
    if (error instanceof HttpDeferredError) throw error
    if (error instanceof HttpError && error.status === 404) status = 'not_found'
    else ctx.log('account check failed', { user: userId, error: String(error) })
  }
  await ctx.db.update(schema.users)
    .set({ redditAccountStatus: status, redditCheckedAt: ctx.now() })
    .where(eq(schema.users.id, userId))
  return status
}

/** Every 12 h: re-check recent posts that are still up, and stale account checks. */
export async function runTracker(ctx: JobContext) {
  const now = ctx.now()
  const since = new Date(now.getTime() - TRACK_DAYS * 86_400_000)
  const posts = await ctx.db.select().from(schema.trackedPosts)
    .where(and(
      ne(schema.trackedPosts.status, 'removed'),
      or(isNull(schema.trackedPosts.postedAt), gte(schema.trackedPosts.postedAt, since)),
    ))
    .orderBy(sql`${schema.trackedPosts.lastCheckedAt} is not null`, asc(schema.trackedPosts.lastCheckedAt))
    .limit(MAX_POSTS_PER_RUN)

  const staleBefore = new Date(now.getTime() - ACCOUNT_RECHECK_MS)
  const accounts = await ctx.db.select({ id: schema.users.id, username: schema.users.redditUsername }).from(schema.users)
    .where(and(
      sql`${schema.users.redditUsername} is not null`,
      or(isNull(schema.users.redditCheckedAt), lt(schema.users.redditCheckedAt, staleBefore)),
    ))
    .limit(MAX_ACCOUNTS_PER_RUN)

  const result = { posts: 0, accounts: 0, deferred: false }
  try {
    for (const a of accounts) {
      await checkRedditAccount(ctx, a.id, a.username!)
      result.accounts++
    }
    for (const p of posts) {
      await checkTrackedPost(ctx, p)
      result.posts++
    }
  }
  catch (error) {
    if (!(error instanceof HttpDeferredError)) throw error
    result.deferred = true
  }
  ctx.log('tracker', result)
  return result
}
