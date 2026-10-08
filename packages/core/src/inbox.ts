import type { Db } from '@social-radar/db'
import { and, count, desc, eq, gte, schema, sql } from '@social-radar/db'

export type ThreadStatus = 'new' | 'saved' | 'replied' | 'dismissed'

/** Intent-scored threads for a project at or above its threshold (or a custom minimum). */
export async function listThreads(db: Db, project: { id: string, intentThreshold: number }, opts: {
  status?: ThreadStatus
  minIntent?: number
  limit?: number
  platform?: 'reddit' | 'hn' | 'bluesky' | 'x' | 'web'
} = {}) {
  const s = schema.threadScores
  const t = schema.threads
  return db
    .select({
      id: t.id,
      platform: t.platform,
      channel: t.channel,
      title: t.title,
      url: t.url,
      author: t.author,
      snippet: t.snippet,
      createdUtc: t.createdUtc,
      source: t.source,
      searchRankFlag: t.searchRankFlag,
      intent: s.intent,
      kind: s.kind,
      reason: s.reason,
      replyAngle: s.replyAngle,
      status: s.status,
    })
    .from(s)
    .innerJoin(t, eq(t.id, s.threadId))
    .where(and(
      eq(s.projectId, project.id),
      eq(s.status, opts.status ?? 'new'),
      gte(s.intent, opts.minIntent ?? project.intentThreshold),
      opts.platform ? eq(t.platform, opts.platform) : undefined,
    ))
    .orderBy(desc(s.intent), desc(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`))
    .limit(Math.min(opts.limit ?? 50, 100))
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

export async function setThreadStatus(db: Db, projectId: string, threadId: string, status: ThreadStatus) {
  const [row] = await db.update(schema.threadScores).set({ status })
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
