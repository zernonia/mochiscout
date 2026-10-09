import type { Db } from '@mochiscout/db'
import { and, count, desc, eq, gte, schema } from '@mochiscout/db'

const WEEK_MS = 7 * 86_400_000

export interface WeeklySummary {
  scored: number
  worthAnswering: number
  replied: number
  posts: number
  removed: number
  painPoints: { title: string, severity: number }[]
}

/** Last 7 days for one project, for the Monday digest (arch phase 4: weekly reports). */
export async function buildWeeklySummary(db: Db, project: { id: string, intentThreshold: number }, now = new Date()): Promise<WeeklySummary> {
  const since = new Date(now.getTime() - WEEK_MS)
  const s = schema.threadScores
  const recent = and(eq(s.projectId, project.id), gte(s.scoredAt, since))
  const [[scored], [worth], [replied], posts, pains] = await Promise.all([
    db.select({ n: count() }).from(s).where(recent),
    db.select({ n: count() }).from(s).where(and(recent, gte(s.intent, project.intentThreshold))),
    db.select({ n: count() }).from(s).where(and(recent, eq(s.status, 'replied'))),
    db.select({ status: schema.trackedPosts.status }).from(schema.trackedPosts)
      .where(and(eq(schema.trackedPosts.projectId, project.id), gte(schema.trackedPosts.postedAt, since))),
    db.select({ title: schema.painPoints.title, severity: schema.painPoints.severity, runId: schema.painPoints.runId })
      .from(schema.painPoints).where(eq(schema.painPoints.projectId, project.id))
      .orderBy(desc(schema.painPoints.createdAt), desc(schema.painPoints.severity)).limit(20),
  ])
  const latestRun = pains[0]?.runId
  return {
    scored: scored?.n ?? 0,
    worthAnswering: worth?.n ?? 0,
    replied: replied?.n ?? 0,
    posts: posts.length,
    removed: posts.filter(p => p.status === 'removed' || p.status === 'not_listed').length,
    painPoints: pains.filter(p => p.runId === latestRun).sort((a, b) => b.severity - a.severity).slice(0, 3)
      .map(p => ({ title: p.title, severity: p.severity })),
  }
}

