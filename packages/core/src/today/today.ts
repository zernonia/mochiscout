import type { Db } from '@mochiscout/db'
import type { Angle } from '../drafter/generate'
import { and, count, desc, eq, gte, schema, sql } from '@mochiscout/db'
import { DEFAULT_COOLDOWN_DAYS, MAX_PROMO_POSTS_PER_DAY } from '../drafter/checks'
import { HN_REPLY_DAYS, REDDIT_ARCHIVE_DAYS } from '@mochiscout/sources'
import { subredditMap } from '../subreddits/map'

const DAY_MS = 86_400_000
const TOP_THREADS = 5

type Project = typeof schema.projects.$inferSelect

export interface PostSuggestion {
  subreddit: string
  angle: Angle
  promo: boolean
  topic: string | null
  why: string
}

export interface TodayPlan {
  threads: {
    id: string
    platform: string
    channel: string | null
    title: string
    url: string
    snippet: string | null
    createdUtc: Date | null
    intent: number
    kind: string
    reason: string | null
    replyAngle: string | null
  }[]
  newCount: number
  /** Leads found (scored at or above the threshold) per day, oldest first, ending today (UTC). */
  trend: number[]
  pendingScoring: number
  suggestion: PostSuggestion | null
  pacing: {
    promoToday: number
    promoLimit: number
    /** When the next promo post is allowed, if the daily cap is used up. */
    nextPromoAt: Date | null
    cooldowns: { subreddit: string, until: Date }[]
  }
}

/** The "10 minutes a day" plan (arch §4): top threads to answer, one post idea, pacing status. */
const TREND_DAYS = 7

export async function buildToday(db: Db, project: Project, now = new Date()): Promise<TodayPlan> {
  const s = schema.threadScores
  const t = schema.threads
  const nowS = Math.floor(now.getTime() / 1000)
  // Only threads that can still be answered (see stateFromAge): not archived, removed or past the reply window.
  const replyable = sql`${t.state} = 'open'
    and not (${t.platform} = 'reddit' and (${t.createdUtc} < ${nowS - REDDIT_ARCHIVE_DAYS * 86_400} or length(${t.id}) <= 16))
    and not (${t.platform} = 'hn' and ${t.createdUtc} < ${nowS - HN_REPLY_DAYS * 86_400})`
  const visible = and(eq(s.projectId, project.id), eq(s.status, 'new'), gte(s.intent, project.intentThreshold), replyable)

  const trendStart = Math.floor(now.getTime() / 1000 / 86_400 - (TREND_DAYS - 1)) * 86_400
  const [threads, [newCount], [pending], history, painPoints, drafted, map, found] = await Promise.all([
    db.select({
      id: t.id,
      platform: t.platform,
      channel: t.channel,
      title: t.title,
      url: t.url,
      snippet: t.snippet,
      createdUtc: t.createdUtc,
      intent: s.intent,
      kind: s.kind,
      reason: s.reason,
      replyAngle: s.replyAngle,
    }).from(s).innerJoin(t, eq(t.id, s.threadId)).where(visible)
      // Fresh threads first among similar scores: replies to new threads get seen.
      .orderBy(desc(sql`${s.intent} - min(20, (unixepoch() - coalesce(${t.createdUtc}, ${t.ingestedAt})) / 21600)`))
      .limit(TOP_THREADS),
    db.select({ n: count() }).from(s).innerJoin(t, eq(t.id, s.threadId)).where(visible),
    db.select({ n: count() }).from(schema.scoreQueue).where(eq(schema.scoreQueue.projectId, project.id)),
    db.select({ subreddit: schema.trackedPosts.subreddit, postedAt: schema.trackedPosts.postedAt, promo: schema.trackedPosts.promo })
      .from(schema.trackedPosts)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.trackedPosts.projectId))
      .where(and(eq(schema.projects.orgId, project.orgId), eq(schema.trackedPosts.promo, true))),
    db.select({ title: schema.painPoints.title, severity: schema.painPoints.severity, runId: schema.painPoints.runId, createdAt: schema.painPoints.createdAt })
      .from(schema.painPoints).where(eq(schema.painPoints.projectId, project.id))
      .orderBy(desc(schema.painPoints.createdAt), desc(schema.painPoints.severity)),
    db.select({ subreddit: schema.drafts.subreddit, title: schema.drafts.title }).from(schema.drafts).where(eq(schema.drafts.projectId, project.id)),
    subredditMap(db, project),
    db.select({ day: sql<number>`cast(${s.scoredAt} / 86400 as integer)`, n: count() }).from(s)
      .where(and(eq(s.projectId, project.id), gte(s.intent, project.intentThreshold), gte(s.scoredAt, new Date(trendStart * 1000))))
      .groupBy(sql`1`),
  ])
  const firstDay = trendStart / 86_400
  const trend = Array.from({ length: TREND_DAYS }, (_, i) => Number(found.find(f => Number(f.day) === firstDay + i)?.n ?? 0))

  // Pacing
  const recent = history.filter(h => h.postedAt && now.getTime() - h.postedAt.getTime() < DAY_MS)
  const promoToday = recent.length
  const nextPromoAt = promoToday >= MAX_PROMO_POSTS_PER_DAY
    ? new Date(Math.min(...recent.map(h => h.postedAt!.getTime())) + DAY_MS)
    : null
  const cooldowns: TodayPlan['pacing']['cooldowns'] = []
  for (const sub of map.filter(m => m.watching)) {
    const last = history.filter(h => h.subreddit === sub.name && h.postedAt).sort((a, b) => b.postedAt!.getTime() - a.postedAt!.getTime())[0]
    if (!last) continue
    const until = new Date(last.postedAt!.getTime() + (sub.rules?.cooldown_days ?? DEFAULT_COOLDOWN_DAYS) * DAY_MS)
    if (until > now) cooldowns.push({ subreddit: sub.name, until })
  }

  // Suggestion: the most severe pain point from the latest research run not drafted yet,
  // in the best-fitting watched sub where a promo post is currently allowed.
  const latestRun = painPoints[0]?.runId
  const draftedText = drafted.map(d => d.title.toLowerCase()).join('\n')
  const topic = painPoints
    .filter(p => p.runId === latestRun)
    .sort((a, b) => b.severity - a.severity)
    .find(p => !draftedText.includes(p.title.toLowerCase().slice(0, 24)))?.title ?? null

  const watched = map.filter(m => m.watching)
  const onCooldown = new Set(cooldowns.map(c => c.subreddit))
  const promoOk = (m: typeof watched[number]) =>
    !onCooldown.has(m.name) && (!m.rules || ['allowed', 'allowed_with_value', 'flair_only'].includes(m.rules.promo_policy))
  const promoSub = nextPromoAt ? undefined : watched.find(promoOk)
  const anySub = watched[0]

  let suggestion: PostSuggestion | null = null
  if (promoSub) {
    suggestion = {
      subreddit: promoSub.name,
      angle: 'story',
      promo: true,
      topic,
      why: `r/${promoSub.name} fits best${promoSub.rules ? '' : ' (check its rules: not in the rules library yet)'}, and you can post a promo today.`,
    }
  }
  else if (anySub) {
    suggestion = {
      subreddit: anySub.name,
      angle: 'lesson',
      promo: false,
      topic,
      why: nextPromoAt
        ? 'You used today\'s promo post. A helpful post without a product mention builds trust for the next one.'
        : 'Promotion is not allowed or on cooldown in your watched subs, so share something useful instead.',
    }
  }

  return {
    threads,
    newCount: newCount?.n ?? 0,
    trend,
    pendingScoring: pending?.n ?? 0,
    suggestion,
    pacing: { promoToday, promoLimit: MAX_PROMO_POSTS_PER_DAY, nextPromoAt, cooldowns },
  }
}
