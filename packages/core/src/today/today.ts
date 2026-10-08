import type { Db } from '@social-radar/db'
import type { Angle } from '../drafter/generate'
import { and, count, desc, eq, gte, schema, sql } from '@social-radar/db'
import { DEFAULT_COOLDOWN_DAYS, MAX_PROMO_POSTS_PER_DAY } from '../drafter/checks'
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
export async function buildToday(db: Db, project: Project, now = new Date()): Promise<TodayPlan> {
  const s = schema.threadScores
  const t = schema.threads
  const visible = and(eq(s.projectId, project.id), eq(s.status, 'new'), gte(s.intent, project.intentThreshold))

  const [threads, [newCount], [pending], history, painPoints, drafted, map] = await Promise.all([
    db.select({
      id: t.id,
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
    db.select({ n: count() }).from(s).where(visible),
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
  ])

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
      why: `r/${promoSub.name} fits best${promoSub.rules ? '' : ' (check its rules: not in the rules DB yet)'}, and you can post a promo today.`,
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
    pendingScoring: pending?.n ?? 0,
    suggestion,
    pacing: { promoToday, promoLimit: MAX_PROMO_POSTS_PER_DAY, nextPromoAt, cooldowns },
  }
}
