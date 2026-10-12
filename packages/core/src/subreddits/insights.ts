import type { Db, SubredditStats } from '@mochiscout/db'
import type { SubredditRules } from '@mochiscout/rules'
import type { OfficialRule } from '@mochiscout/sources'
import type { JobContext } from '../jobs/context'
import type { RulesSource } from './rules'
import { and, eq, gte, inArray, isNull, lt, or, schema, sql } from '@mochiscout/db'
import { getRules } from '@mochiscout/rules'
import { HttpDeferredError } from '@mochiscout/sources'
import { extractAutoRules, resolveRulesMany, saveAutoRules } from './rules'

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
/** Mods change rules now and then; re-read every two weeks. */
const AUTO_RULES_TTL_MS = 14 * DAY_MS
/** Subs whose rules couldn't be read (fetch failed) wait this long before a retry. */
const AUTO_RULES_RETRY_MS = DAY_MS
/** A manual re-check reads again only if the last read is older than this. */
const AUTO_RULES_FORCE_MIN_MS = 10 * 60_000
const AUTO_RULES_PER_RUN = 12

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
      .from(t).where(and(eq(t.platform, 'reddit'), gte(t.createdUtc, new Date(since * 1000))))
      .groupBy(t.channel, sql`2`),
    ctx.db.select({ sub: t.channel, n: sql<number>`count(distinct ${t.id})` })
      .from(s).innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(t.platform, 'reddit'), inArray(s.kind, ['seeking_tool', 'comparison']), gte(s.intent, 60), gte(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`, since)))
      .groupBy(t.channel),
    // Author deletions aren't moderation; leave them out of both counts.
    ctx.db.select({ sub: t.channel, checked: sql<number>`count(*)`, removed: sql<number>`sum(${t.state} = 'removed')` })
      .from(t).where(and(eq(t.platform, 'reddit'), sql`${t.contextFetchedAt} is not null`, sql`${t.state} != 'deleted'`))
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
      .where(and(eq(t.platform, 'reddit'), inArray(s.replyStatus, ['live', 'removed'])))
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

/** Daily: refresh pooled stats, then read rules for a few subs that have none. */
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

  const result = { subs: stats.size, rulesRead: 0, deferred: false }
  if (!ctx.llm || (ctx.readMode && ctx.readMode !== 'server')) return result

  // Watched subs first, then the busiest, whose rules are missing or stale.
  const [stale, watched] = await Promise.all([
    ctx.db.select({ name: schema.subreddits.name, stats: schema.subreddits.stats }).from(schema.subreddits)
      .where(or(isNull(schema.subreddits.autoRulesAt), lt(schema.subreddits.autoRulesAt, new Date(now.getTime() - AUTO_RULES_TTL_MS)))),
    ctx.db.selectDistinct({ name: schema.projectSubreddits.subreddit }).from(schema.projectSubreddits).where(eq(schema.projectSubreddits.watching, true)),
  ])
  const watchedNames = new Set(watched.map(w => w.name))
  const due = stale
    .filter(r => watchedNames.has(r.name) || (r.stats && (ctx.pages || !getRules(r.name))))
    .sort((a, b) => Number(watchedNames.has(b.name)) - Number(watchedNames.has(a.name)) || (b.stats?.posts30d ?? 0) - (a.stats?.posts30d ?? 0))
    .slice(0, AUTO_RULES_PER_RUN)
    .map(r => r.name)

  const read = await readRules(ctx, due)
  result.rulesRead = read.read
  result.deferred = read.deferred
  ctx.log('insights', result)
  return result
}

/** Read and store rules for these subs, one at a time. Stops early when Reddit asks to wait. */
async function readRules(ctx: JobContext, names: string[]) {
  const out = { read: 0, failed: 0, deferred: false }
  if (!ctx.llm) return out
  for (const name of names) {
    const now = ctx.now()
    try {
      const found = await extractAutoRules(ctx.http, ctx.llm, name, ctx.pages)
      await saveAutoRules(ctx.db, name, found, now)
      // Shared-network spend isn't any one org's usage, so it is only logged.
      if (found.usage.inputTokens) ctx.log('subreddit rules usage', { subreddit: name, ...found.usage })
      out.read++
    }
    catch (error) {
      if (error instanceof HttpDeferredError) { out.deferred = true; break }
      out.failed++
      ctx.log('subreddit rules failed', { subreddit: name, error: String(error) })
      // Retry tomorrow instead of on every run (rows with rules keep them).
      const retryAt = new Date(now.getTime() - AUTO_RULES_TTL_MS + AUTO_RULES_RETRY_MS)
      await ctx.db.insert(schema.subreddits).values({ name, autoRulesAt: retryAt })
        .onConflictDoUpdate({ target: schema.subreddits.name, set: { autoRulesAt: retryAt } })
    }
  }
  return out
}

/**
 * Read rules right away for subs a user just started watching (missing or
 * stale only), or re-check one on request (`force`, rate-limited).
 */
export async function refreshSubredditRules(ctx: JobContext, names: string[], opts: { force?: boolean, max?: number } = {}) {
  if (!names.length || !ctx.llm || (ctx.readMode && ctx.readMode !== 'server')) return { read: 0, failed: 0, deferred: false }
  const now = ctx.now().getTime()
  const rows = await ctx.db.select({ name: schema.subreddits.name, at: schema.subreddits.autoRulesAt, auto: schema.subreddits.autoRules })
    .from(schema.subreddits).where(inArray(schema.subreddits.name, names))
  const byName = new Map(rows.map(r => [r.name, r]))
  const due = names.filter((name) => {
    const at = byName.get(name)?.at?.getTime()
    if (at === undefined) return true
    if (opts.force) return now - at > AUTO_RULES_FORCE_MIN_MS
    // Rules read before official ones were available get upgraded once a fetcher is configured.
    const upgrade = !!ctx.pages && !byName.get(name)?.auto?.official && now - at > AUTO_RULES_RETRY_MS
    return now - at > AUTO_RULES_TTL_MS || upgrade
  })
  return readRules(ctx, due.slice(0, opts.max ?? 5))
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

export interface PublicSubreddit {
  name: string
  description: string | null
  stats: SubredditStats
  statsAt: Date | null
  rules: SubredditRules | null
  rulesSource: RulesSource | null
  /** Pinned-post titles the auto rules were read from. */
  rulesEvidence: string[]
  /** The sub's official rules, verbatim, when they were read. */
  officialRules: OfficialRule[]
  rulesCheckedAt: Date | null
  verdict: SubredditVerdict
  peakHours: { hour: number, share: number }[]
  /** Enough real data to be worth a search result (rules known or enough removal samples). */
  indexable: boolean
}

/** Subs with a public page: enough activity for the pooled stats to mean something. */
export async function publicSubreddits(db: Db, opts: { name?: string } = {}): Promise<PublicSubreddit[]> {
  const rows = await db.select().from(schema.subreddits)
    .where(opts.name ? eq(schema.subreddits.name, opts.name.toLowerCase()) : sql`${schema.subreddits.stats} is not null`)
  const eligible = rows.filter(r => r.stats && r.stats.posts30d >= STATS_MIN_POSTS)
  const resolved = await resolveRulesMany(db, eligible.map(r => r.name))
  return eligible.map((r) => {
    const rr = resolved.get(r.name)
    const rules = rr?.rules ?? null
    const verdict = subredditVerdict(rules, r.stats)
    return {
      name: r.name,
      description: r.description,
      stats: r.stats!,
      statsAt: r.statsAt,
      rules,
      rulesSource: rr?.source ?? null,
      rulesEvidence: rr?.source === 'auto' ? r.autoRules?.evidence ?? [] : [],
      officialRules: r.autoRules?.official ?? [],
      rulesCheckedAt: rr?.checkedAt ?? null,
      verdict,
      peakHours: peakHours(r.stats!),
      indexable: !!rules || verdict.removalRate !== null,
    }
  }).sort((a, b) => b.stats.posts30d - a.stats.posts30d)
}
