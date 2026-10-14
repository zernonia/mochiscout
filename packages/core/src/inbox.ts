import type { Db } from '@mochiscout/db'
import type { DismissReason } from './leads/learning'
import { and, count, desc, eq, gte, schema, sql } from '@mochiscout/db'
import { getRules } from '@mochiscout/rules'
import { assessLead, isClosed } from './leads/assess'
import { alsoAsking, openToDms } from './leads/signals'

export type ThreadStatus = 'new' | 'saved' | 'replied' | 'dismissed'
export type InboxSort = 'opportunity' | 'intent' | 'newest'

/** Rows read before ranking: opportunity is computed in code, so fetch more than the page. */
const RANK_POOL = 150

/**
 * Intent-scored threads for a project at or above its threshold (or a custom
 * minimum), ranked by opportunity by default: open, fresh, uncrowded threads
 * first; threads nobody can reply to any more sink to the bottom.
 */
export async function listThreads(db: Db, project: { id: string, intentThreshold: number, competitors?: string[] }, opts: {
  status?: ThreadStatus
  minIntent?: number
  limit?: number
  platform?: 'reddit' | 'hn' | 'bluesky' | 'x' | 'web'
  sort?: InboxSort
  /** Only threads that already have a reply draft. */
  drafted?: boolean
  now?: Date
} = {}) {
  const s = schema.threadScores
  const t = schema.threads
  const now = opts.now ?? new Date()
  const limit = Math.min(opts.limit ?? 50, 100)
  const rows = await db
    .select({
      id: t.id,
      platform: t.platform,
      channel: t.channel,
      title: t.title,
      url: t.url,
      author: t.author,
      snippet: t.snippet,
      body: t.body,
      createdUtc: t.createdUtc,
      source: t.source,
      searchRankFlag: t.searchRankFlag,
      intent: s.intent,
      kind: s.kind,
      reason: s.reason,
      replyAngle: s.replyAngle,
      replyDraft: s.replyDraft,
      replyDraftedAt: s.replyDraftedAt,
      status: s.status,
      dismissReason: s.dismissReason,
      replyUrl: s.replyUrl,
      replyStatus: s.replyStatus,
      refCode: s.refCode,
      state: t.state,
      engagement: t.engagement,
      comments: t.comments,
      contextFetchedAt: t.contextFetchedAt,
    })
    .from(s)
    .innerJoin(t, eq(t.id, s.threadId))
    .where(and(
      eq(s.projectId, project.id),
      eq(s.status, opts.status ?? 'new'),
      gte(s.intent, opts.minIntent ?? project.intentThreshold),
      opts.platform ? eq(t.platform, opts.platform) : undefined,
      opts.drafted ? sql`${s.replyDraft} is not null and ${s.replyDraft} != ''` : undefined,
    ))
    .orderBy(opts.sort === 'newest' ? desc(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`) : desc(s.intent), desc(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`))
    .limit(opts.sort && opts.sort !== 'opportunity' ? limit : RANK_POOL)

  const ranked = rows.map(({ comments, engagement, body, ...row }) => ({
    ...row,
    dismissReason: row.dismissReason as DismissReason | null,
    ...assessLead({ ...row, comments, engagement }, project.competitors ?? [], now),
    alsoAsking: alsoAsking(comments, row.author),
    openToDms: openToDms({ ...row, body }, row.platform === 'reddit' && row.channel ? getRules(row.channel) : null),
  }))
  if (!opts.sort || opts.sort === 'opportunity') {
    ranked.sort((a, b) => Number(isClosed(a.state)) - Number(isClosed(b.state)) || b.opportunity - a.opportunity || b.intent - a.intent)
  }
  return ranked.slice(0, limit)
}

/**
 * The ready-to-post queue: new and saved threads that already have a reply
 * draft (written by the auto-draft job or by the user) and can still be
 * answered, best opportunity first.
 */
export async function readyToPost(db: Db, project: { id: string, intentThreshold: number, competitors?: string[] }, limit = 10) {
  const [fresh, saved] = await Promise.all([
    listThreads(db, project, { status: 'new', drafted: true, limit }),
    listThreads(db, project, { status: 'saved', drafted: true, limit }),
  ])
  return [...fresh, ...saved]
    .filter(t => !isClosed(t.state))
    .sort((a, b) => b.opportunity - a.opportunity || b.intent - a.intent)
    .slice(0, limit)
}

export async function inboxCounts(db: Db, project: { id: string, intentThreshold: number }) {
  const s = schema.threadScores
  const [rows, [pending]] = await Promise.all([
    db.select({ status: s.status, n: count() }).from(s)
      .where(and(eq(s.projectId, project.id), gte(s.intent, project.intentThreshold)))
      .groupBy(s.status),
    db.select({ n: count() }).from(schema.scoreQueue).where(eq(schema.scoreQueue.projectId, project.id)),
  ])
  return {
    counts: Object.fromEntries(rows.map(r => [r.status, r.n])) as Partial<Record<ThreadStatus, number>>,
    pendingScoring: pending?.n ?? 0,
  }
}

export async function setThreadStatus(db: Db, projectId: string, threadId: string, status: ThreadStatus, dismissReason?: DismissReason | null) {
  const [row] = await db.update(schema.threadScores)
    .set({ status, statusChangedAt: new Date(), dismissReason: status === 'dismissed' ? dismissReason ?? null : null })
    .where(and(eq(schema.threadScores.projectId, projectId), eq(schema.threadScores.threadId, threadId)))
    .returning({ threadId: schema.threadScores.threadId, status: schema.threadScores.status })
  return row ?? null
}

/** Latest research run's pain points, most severe first. */
export async function latestPainPoints(db: Db, projectId: string) {
  const latest = await db.select({ runId: schema.painPoints.runId, createdAt: schema.painPoints.createdAt })
    .from(schema.painPoints).where(eq(schema.painPoints.projectId, projectId))
    .orderBy(desc(schema.painPoints.createdAt)).limit(1).get()
  if (!latest) return { ranAt: null, points: [] }
  const points = await db.select().from(schema.painPoints)
    .where(eq(schema.painPoints.runId, latest.runId))
    .orderBy(desc(schema.painPoints.severity))
  return {
    ranAt: latest.createdAt,
    points: points.map(p => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      severity: p.severity,
      evidence: (p.evidence ?? []) as { threadId: string, url: string, title: string, subreddit: string | null, paraphrase: string }[],
      subreddits: p.subreddits ?? [],
    })),
  }
}
