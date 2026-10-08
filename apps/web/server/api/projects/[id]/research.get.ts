import { desc, eq, schema } from '@social-radar/db'

/** Latest research run's pain points, and whether a run is in progress. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const env = getEnv(event)
  const db = getDb(event)
  const latest = await db
    .select({ runId: schema.painPoints.runId, createdAt: schema.painPoints.createdAt })
    .from(schema.painPoints)
    .where(eq(schema.painPoints.projectId, project.id))
    .orderBy(desc(schema.painPoints.createdAt))
    .limit(1)
    .get()
  const points = latest
    ? await db.select().from(schema.painPoints)
      .where(eq(schema.painPoints.runId, latest.runId))
      .orderBy(desc(schema.painPoints.severity))
    : []
  return {
    llmConfigured: getLlm(env) !== null,
    searchConfigured: Boolean(env.TINYFISH_API_KEY || env.BRAVE_API_KEY),
    running: (await env.CACHE.get(researchLockKey(project.id))) !== null,
    ranAt: latest?.createdAt ?? null,
    points: points.map(p => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      severity: p.severity,
      evidence: (p.evidence ?? []) as { threadId: string, url: string, title: string, subreddit: string | null, paraphrase: string }[],
      subreddits: p.subreddits ?? [],
    })),
  }
})
