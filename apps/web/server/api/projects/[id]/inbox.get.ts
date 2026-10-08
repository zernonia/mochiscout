import { and, count, desc, eq, gte, schema, sql } from '@social-radar/db'
import { z } from 'zod'

const Query = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).default('new'),
})

/** Intent-scored threads at or above the project's threshold. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { status } = await getValidatedQuery(event, Query.parse)
  const db = getDb(event)
  const s = schema.threadScores
  const t = schema.threads

  const [threads, [pending], counts] = await Promise.all([
    db
      .select({
        id: t.id,
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
      .where(and(eq(s.projectId, project.id), eq(s.status, status), gte(s.intent, project.intentThreshold)))
      .orderBy(desc(s.intent), desc(sql`coalesce(${t.createdUtc}, ${t.ingestedAt})`))
      .limit(50),
    db.select({ n: count() }).from(schema.scoreQueue).where(eq(schema.scoreQueue.projectId, project.id)),
    db
      .select({ status: s.status, n: count() })
      .from(s)
      .where(and(eq(s.projectId, project.id), gte(s.intent, project.intentThreshold)))
      .groupBy(s.status),
  ])

  return {
    threshold: project.intentThreshold,
    pendingScoring: pending?.n ?? 0,
    llmConfigured: getLlm(getEnv(event)) !== null,
    counts: Object.fromEntries(counts.map(c => [c.status, c.n])) as Partial<Record<typeof status, number>>,
    threads,
  }
})
