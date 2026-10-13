import type { JobContext } from './context'
import type { FetchGroupJob } from './types'
import { and, eq, schema, sql } from '@mochiscout/db'
import { FEED_LIMIT, newPostsFeedUrl, parseRedditFeed } from '@mochiscout/sources'
import { queueRssThreads } from '../scoring/queue'

/** Busy subs share a feed with fewer others so 100 entries still cover the gap since last fetch. */
const BUSY_INTERVAL_MIN = 15
const BUSY_GROUP_SIZE = 2
const GROUP_SIZE = 10
const MIN_INTERVAL_MIN = 15
const MAX_INTERVAL_MIN = 360
/** Aim to see about this many new posts per sub per fetch. */
const TARGET_POSTS_PER_FETCH = 10

/** Watched subreddits whose refresh interval has elapsed, grouped into combined feeds. */
export async function planFetch(ctx: JobContext): Promise<FetchGroupJob[]> {
  const nowS = Math.floor(ctx.now().getTime() / 1000)
  const due = await ctx.db
    .selectDistinct({
      name: schema.subreddits.name,
      interval: schema.subreddits.refreshIntervalMin,
    })
    .from(schema.subreddits)
    .innerJoin(
      schema.projectSubreddits,
      and(
        eq(schema.projectSubreddits.subreddit, schema.subreddits.name),
        eq(schema.projectSubreddits.watching, true),
      ),
    )
    .where(sql`${schema.subreddits.lastRssAt} is null
      or ${schema.subreddits.lastRssAt} + ${schema.subreddits.refreshIntervalMin} * 60 <= ${nowS}`)
    .orderBy(sql`${schema.subreddits.lastRssAt} is not null`, schema.subreddits.lastRssAt)

  const busy = due.filter(s => s.interval <= BUSY_INTERVAL_MIN).map(s => s.name)
  const quiet = due.filter(s => s.interval > BUSY_INTERVAL_MIN).map(s => s.name)
  return [...chunk(busy, BUSY_GROUP_SIZE), ...chunk(quiet, GROUP_SIZE)].map(subreddits => ({
    type: 'fetch-group' as const,
    subreddits,
  }))
}

export interface FetchGroupResult {
  fetched: number
  newThreadIds: string[]
  /** New threads that passed a watching project's prefilter. */
  queued: number
}

/** Fetch one combined feed, upsert threads, and adapt each sub's refresh interval. */
export async function runFetchGroup(ctx: JobContext, job: FetchGroupJob): Promise<FetchGroupResult> {
  const res = await ctx.http.getText(newPostsFeedUrl(job.subreddits))
  const now = ctx.now()
  const posts = res.status === 'ok' ? parseRedditFeed(res.body) : []

  const inserts = posts.map(p =>
    ctx.db
      .insert(schema.threads)
      .values({
        id: p.id,
        platform: p.platform,
        channel: p.channel,
        title: p.title,
        url: p.url,
        author: p.author,
        createdUtc: p.createdAt,
        snippet: p.snippet,
        source: 'rss',
      })
      // A post first stored from someone's browser extension is replaced by
      // Reddit's own copy (the upload could say anything), then queued like a new one.
      .onConflictDoUpdate({
        target: schema.threads.id,
        set: { channel: p.channel, title: p.title, url: p.url, author: p.author, createdUtc: p.createdAt, snippet: p.snippet, source: 'rss' },
        setWhere: eq(schema.threads.source, 'extension'),
      })
      .returning({ id: schema.threads.id }),
  )
  const inserted = nonEmpty(inserts) ? await ctx.db.batch(inserts) : []
  const newThreadIds = inserted.flat().map(r => r.id)

  // The feed is newest-first and capped at FEED_LIMIT across all subs, so its
  // time window is the same for every sub in it: each sub's count over that
  // window is its posting rate. A full feed means older posts since the last
  // fetch may be missing; the busy sub then gets a short interval and a
  // smaller group next time.
  const truncated = posts.length >= FEED_LIMIT
  const times = posts.flatMap(p => (p.createdAt ? [p.createdAt.getTime()] : []))
  const windowStart = times.length ? Math.min(...times) : now.getTime()
  const windowHours = Math.max((now.getTime() - windowStart) / 3_600_000, 0.25)

  const updates = job.subreddits.map((name) => {
    const count = posts.filter(p => p.channel === name).length
    return ctx.db
      .update(schema.subreddits)
      .set({ lastRssAt: now, refreshIntervalMin: nextInterval(count / windowHours) })
      .where(eq(schema.subreddits.name, name))
  })
  if (nonEmpty(updates)) await ctx.db.batch(updates)

  const queued = await queueRssThreads(ctx, newThreadIds)
  ctx.log('fetch-group', { subreddits: job.subreddits, fetched: posts.length, new: newThreadIds.length, queued, truncated })
  return { fetched: posts.length, newThreadIds, queued }
}

/** Busy subs every 15 min, quiet subs every 1–6 h. */
export function nextInterval(postsPerHour: number): number {
  if (postsPerHour <= 0) return MAX_INTERVAL_MIN
  const minutes = (TARGET_POSTS_PER_FETCH / postsPerHour) * 60
  return Math.round(Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, minutes)))
}

function nonEmpty<T>(items: T[]): items is [T, ...T[]] {
  return items.length > 0
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
