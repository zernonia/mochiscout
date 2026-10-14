import { inboxCounts, isClosed, learningStats, listThreads } from '@mochiscout/core'
import { z } from 'zod'

const Query = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).default('new'),
  platform: z.enum(['reddit', 'hn', 'bluesky', 'x']).optional(),
  sort: z.enum(['opportunity', 'intent', 'newest']).default('opportunity'),
  /** A lower bar than the project's threshold, for showing near misses when nothing clears it yet. */
  minIntent: z.coerce.number().int().min(30).max(100).optional(),
})

/** Intent-scored threads at or above the project's threshold, best opportunities first. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { status, platform, sort, minIntent } = await getValidatedQuery(event, Query.parse)
  const db = getDb(event)
  const [threads, { counts, pendingScoring }, learning] = await Promise.all([
    listThreads(db, project, { status, platform, sort, minIntent, limit: 100 }),
    inboxCounts(db, project),
    learningStats(db, project.id),
  ])
  return {
    threshold: project.intentThreshold,
    pendingScoring,
    llmConfigured: getLlm(getEnv(event)) !== null,
    counts,
    hot: threads.filter(t => t.hot).length,
    closed: threads.filter(t => isClosed(t.state)).length,
    learning,
    threads,
  }
})
