import type { Db, SubredditStats } from '@mochiscout/db'
import type { SubredditRules } from '@mochiscout/rules'
import type { JobContext } from '../jobs/context'
import type { RulesSource } from './rules'
import { and, eq, gte, inArray, ne, schema, sql } from '@mochiscout/db'
import { allRules } from '@mochiscout/rules'
import { readMissingRules, resolveRulesMany } from './rules'

/**
 * The safe-to-post network: outcomes pooled across every project, per
 * subreddit, as anonymous counts. No project, user or post is identifiable in
 * the result; each user's posts and replies only ever add to a total.
 */

const DAY_MS = 86_400_000
const WINDOW_DAYS = 30
/** Posts in 30 days before a sub gets stats (and a public page). */
export const STATS_MIN_POSTS = 20
/** Samples before a removal rate is shown or used. */
export const RATE_MIN_SAMPLES = 10

const emptyStats = (): SubredditStats => ({
  posts30d: 0, hours: Array.from({ length: 24 }, () => 0), buyingPosts30d: 0,
  checked: 0, removed: 0, ownPosts: 0, ownPostsRemoved: 0, ownReplies: 0, ownRepliesRemoved: 0, linkedReplies: 0, linkedRepliesRemoved: 0,
})

/** Aggregate pooled stats for every sub with enough activity (or that someone watches). */
export async function computeSubredditStats(ctx: JobContext): Promise<Map<string, SubredditStats>> {
  const since = Math.floor((ctx.now().getTime() - WINDOW_DAYS * DAY_MS) / 1000)
  const t = schema.threads
  const s = schema.threadScores
  const [hours, buying, checks, own, replies, watched] = await Promise.all([
    ctx.db.select({ sub: t.channel, hour: sql<string>`strftime('%H', ${t.createdUtc}, 'unixepoch')`, n: sql<number>`count(*)` })
      .from(t).where(and(eq(t.platform, 'reddit'), ne(t.source, 'extension'), gte(t.createdUtc, new Date(since * 1000))))
      .groupBy(t.channel, sql`2`),
    ctx.db.select({ sub: t.channel, n: sql<number>`count(distinct ${t.id})` })
      .from(s).innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(t.platform, 'reddit'), ne(t.source, 'extension'), inArray(s.kind, ['seeking_tool', 'comparison']), gte(s.intent, 60), gte(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`, since)))
      .groupBy(t.channel),
    // Author deletions aren't moderation; leave them out of both counts.
    ctx.db.select({ sub: t.channel, checked: sql<number>`count(*)`, removed: sql<number>`sum(${t.state} = 'removed')` })
      .from(t).where(and(eq(t.platform, 'reddit'), ne(t.source, 'extension'), sql`${t.contextFetchedAt} is not null`, sql`${t.state} != 'deleted'`))
      .groupBy(t.channel),
    ctx.db.select({ sub: schema.trackedPosts.subreddit, n: sql<number>`count(*)`, removed: sql<number>`sum(${schema.trackedPosts.status} in ('removed', 'not_listed'))` })
      .from(schema.trackedPosts).where(inArray(schema.trackedPosts.status, ['live', 'removed', 'not_listed']))
      .groupBy(schema.trackedPosts.subreddit),
    ctx.db.select({
      sub: t.channel,
      n: sql<number>`count(*)`,
      removed: sql<number>`sum(${s.replyStatus} = 'removed')`,
      linked: sql<number>`sum(${s.replyDraft} like '%http%')`,
      linkedRemoved: sql<number>`sum(${s.replyDraft} like '%http%' and ${s.replyStatus} = 'removed')`,
    }).from(s).innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(t.platform, 'reddit'), ne(t.source, 'extension'), inArray(s.replyStatus, ['live', 'removed'])))
      .groupBy(t.channel),
    ctx.db.selectDistinct({ sub: schema.projectSubreddits.subreddit }).from(schema.projectSubreddits).where(eq(schema.projectSubreddits.watching, true)),
  ])

  const stats = new Map<string, SubredditStats>()
  const get = (sub: string | null) => {
    if (!sub) return null
    const key = sub.toLowerCase()
    if (!stats.has(key)) stats.set(key, emptyStats())
    return stats.get(key)!
  }
  for (const r of hours) {
    const st = get(r.sub)
    if (!st) continue
    st.posts30d += Number(r.n)
    st.hours[Number(r.hour)] = (st.hours[Number(r.hour)] ?? 0) + Number(r.n)
  }
  for (const st of stats.values()) {
    if (st.posts30d) st.hours = st.hours.map(h => Math.round((h / st.posts30d) * 1000) / 1000)
  }
  for (const r of buying) { const st = get(r.sub); if (st) st.buyingPosts30d = Number(r.n) }
  for (const r of checks) { const st = get(r.sub); if (st) { st.checked = Number(r.checked); st.removed = Number(r.removed ?? 0) } }
  for (const r of own) { const st = get(r.sub); if (st) { st.ownPosts = Number(r.n); st.ownPostsRemoved = Number(r.removed ?? 0) } }
  for (const r of replies) {
    const st = get(r.sub)
    if (!st) continue
    st.ownReplies = Number(r.n)
    st.ownRepliesRemoved = Number(r.removed ?? 0)
    st.linkedReplies = Number(r.linked ?? 0)
    st.linkedRepliesRemoved = Number(r.linkedRemoved ?? 0)
  }

  const watchedSet = new Set(watched.map(w => w.sub.toLowerCase()))
  for (const [sub, st] of stats) {
    if (st.posts30d < STATS_MIN_POSTS && !watchedSet.has(sub) && !st.ownPosts && !st.ownReplies) stats.delete(sub)
  }
  return stats
}

/** Daily: refresh pooled stats, and read official rules for watched subs the rules library doesn't have yet. */
export async function runSubredditInsights(ctx: JobContext) {
  const now = ctx.now()
  const stats = await computeSubredditStats(ctx)
  const statements = [...stats].map(([name, st]) =>
    ctx.db.insert(schema.subreddits).values({ name, stats: st, statsAt: now })
      .onConflictDoUpdate({ target: schema.subreddits.name, set: { stats: st, statsAt: now } }))
  for (let i = 0; i < statements.length; i += 50) {
    const batch = statements.slice(i, i + 50)
    if (batch.length) await ctx.db.batch(batch as [typeof batch[number], ...typeof batch])
  }

  // Normally read the moment someone watches the sub; this catches misses and stale reads.
  const watched = await ctx.db.selectDistinct({ name: schema.projectSubreddits.subreddit }).from(schema.projectSubreddits)
    .where(eq(schema.projectSubreddits.watching, true))
  const rules = await readMissingRules(ctx, watched.map(w => w.name), { max: 10 })
  const result = { subs: stats.size, rules }
  ctx.log('insights', result)
  return result
}

export type PromoGrade = 'friendly' | 'careful' | 'strict' | 'unknown'

export interface SubredditVerdict {
  grade: PromoGrade
  /** Removal rate of checked posts, when there are enough samples. */
  removalRate: number | null
  /** Removal rate of our users' replies that included a link. */
  linkedReplyRemovalRate: number | null
  reasons: string[]
}

const rate = (removed: number, total: number) => (total >= RATE_MIN_SAMPLES ? removed / total : null)
const pct = (r: number) => `${Math.round(r * 100)}%`

/** How safe it is to mention a product here, from the rules and observed removals. */
export function subredditVerdict(rules: SubredditRules | null, stats: SubredditStats | null): SubredditVerdict {
  const reasons: string[] = []
  let grade: PromoGrade = 'unknown'
  const rank: Record<PromoGrade, number> = { unknown: -1, friendly: 0, careful: 1, strict: 2 }
  const atLeast = (g: PromoGrade) => { if (rank[g] > rank[grade]) grade = g }

  if (rules) {
    switch (rules.promo_policy) {
      case 'none': atLeast('strict'); reasons.push('No self-promotion allowed.'); break
      case 'weekly_thread_only': atLeast('careful'); reasons.push(`Promotion only in ${rules.self_promo_thread ? `the "${rules.self_promo_thread}" thread` : 'a recurring thread'}.`); break
      case 'flair_only': atLeast('careful'); reasons.push('Promotion only with the right post flair.'); break
      case 'allowed_with_value': grade = grade === 'unknown' ? 'friendly' : grade; reasons.push('Promotion allowed when the post is genuinely useful.'); break
      case 'allowed': grade = grade === 'unknown' ? 'friendly' : grade; reasons.push('Self-promotion allowed.'); break
    }
    if (rules.links_allowed === 'none') { atLeast('careful'); reasons.push('No links to your own site.') }
    if (rules.links_allowed === 'in_comments_only') reasons.push('Links only in comments.')
    if (rules.min_karma) reasons.push(`Needs ${rules.min_karma}+ karma to post.`)
    if (rules.min_account_age_days) reasons.push(`Accounts must be ${rules.min_account_age_days}+ days old.`)
  }

  const removalRate = stats ? rate(stats.removed, stats.checked) : null
  if (removalRate !== null) {
    if (removalRate >= 0.25) { atLeast('strict'); reasons.push(`Moderators removed ${pct(removalRate)} of the posts we checked.`) }
    else if (removalRate >= 0.1) { atLeast('careful'); reasons.push(`Moderators removed ${pct(removalRate)} of the posts we checked.`) }
    else { if (grade === 'unknown') grade = 'friendly'; reasons.push(`Only ${pct(removalRate)} of the posts we checked were removed.`) }
  }
  const linkedReplyRemovalRate = stats ? rate(stats.linkedRepliesRemoved, stats.linkedReplies) : null
  if (linkedReplyRemovalRate !== null && linkedReplyRemovalRate >= 0.3) {
    atLeast('careful')
    reasons.push(`${pct(linkedReplyRemovalRate)} of replies with a link were removed. Leave the link out.`)
  }
  return { grade, removalRate, linkedReplyRemovalRate, reasons }
}

/** Busiest posting hours (UTC), best first. */
export function peakHours(stats: SubredditStats, n = 3) {
  return stats.hours.map((share, hour) => ({ hour, share })).sort((a, b) => b.share - a.share).slice(0, n).filter(h => h.share > 0)
}

/** Below this many posts in 30 days, the hourly pattern is mostly noise. */
const MIN_POSTS_FOR_TIMING = 30

export interface PostingTime {
  /** UTC hour that starts the sub's busiest two-hour window. */
  peakStartHour: number
  /** When that window next starts (now, if it is under way). */
  nextPeakAt: Date
  /** The current hour is one of the sub's six busiest. */
  goodNow: boolean
}

/** When a subreddit is most active, from 30 days of post times; null when there is too little data. */
export function bestPostingTime(stats: Pick<SubredditStats, 'hours' | 'posts30d'> | null | undefined, now = new Date()): PostingTime | null {
  if (!stats || stats.posts30d < MIN_POSTS_FOR_TIMING || stats.hours.length !== 24) return null
  const hours = stats.hours
  // Two-hour windows, wrapping past midnight, smooth out single-hour spikes.
  let peakStartHour = 0
  for (let h = 1; h < 24; h++) {
    if (hours[h]! + hours[(h + 1) % 24]! > hours[peakStartHour]! + hours[(peakStartHour + 1) % 24]!) peakStartHour = h
  }
  const nowHour = now.getUTCHours()
  const inPeak = nowHour === peakStartHour || nowHour === (peakStartHour + 1) % 24
  let nextPeakAt = now
  if (!inPeak) {
    nextPeakAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), peakStartHour))
    if (nextPeakAt <= now) nextPeakAt = new Date(nextPeakAt.getTime() + 86_400_000)
  }
  const busiest = hours.map((share, hour) => ({ hour, share })).sort((a, b) => b.share - a.share).slice(0, 6)
  return { peakStartHour, nextPeakAt, goodNow: busiest.some(b => b.hour === nowHour && b.share > 0) }
}

export interface PublicSubreddit {
  /** Lowercase, for URLs. */
  name: string
  /** Reddit's casing, e.g. "SaaS". */
  displayName: string
  description: string | null
  /** Pooled stats, once the sub has enough activity in our data. */
  stats: SubredditStats | null
  statsAt: Date | null
  rules: SubredditRules | null
  rulesSource: RulesSource | null

  verdict: SubredditVerdict
  peakHours: { hour: number, share: number }[]
  /** Enough real data to be worth a search result (rules known or enough removal samples). */
  indexable: boolean
}

/**
 * Subs with a public page: every sub in the rules library or with rules read
 * automatically, plus subs with enough activity for pooled stats to mean
 * something. Busiest first, then by name.
 */
export async function publicSubreddits(db: Db, opts: { name?: string } = {}): Promise<PublicSubreddit[]> {
  const wanted = opts.name?.toLowerCase()
  const rows = await db.select().from(schema.subreddits)
    .where(wanted ? eq(schema.subreddits.name, wanted) : sql`${schema.subreddits.stats} is not null or ${schema.subreddits.autoRules} is not null`)
  const byName = new Map(rows.map(r => [r.name, r]))
  const names = new Set(rows.filter(r => (r.stats && r.stats.posts30d >= STATS_MIN_POSTS) || r.autoRules).map(r => r.name))
  for (const r of allRules()) {
    const key = r.name.toLowerCase()
    if (!wanted || key === wanted) names.add(key)
  }
  const resolved = await resolveRulesMany(db, [...names])
  return [...names].flatMap((name) => {
    const r = byName.get(name)
    const rr = resolved.get(name)
    const rules = rr?.rules ?? null
    const stats = r?.stats && r.stats.posts30d >= STATS_MIN_POSTS ? r.stats : null
    if (!rules && !stats) return []
    const verdict = subredditVerdict(rules, stats)
    return [{
      name,
      displayName: rules?.name ?? name,
      description: r?.description ?? null,
      stats,
      statsAt: r?.statsAt ?? null,
      rules,
      rulesSource: rr?.source ?? null,
      verdict,
      peakHours: stats ? peakHours(stats) : [],
      indexable: !!rules || verdict.removalRate !== null,
    }]
  }).sort((a, b) => (b.stats?.posts30d ?? 0) - (a.stats?.posts30d ?? 0) || a.name.localeCompare(b.name))
}
