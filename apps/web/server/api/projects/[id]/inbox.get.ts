import { inboxCounts, isClosed, learningStats, listThreads } from '@mochiscout/core'
import { z } from 'zod'

const Query = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).default('new'),
  platform: z.enum(['reddit', 'hn', 'bluesky', 'x']).optional(),
  sort: z.enum(['opportunity', 'intent', 'newest']).default('opportunity'),
})

/** Intent-scored threads at or above the project's threshold, best opportunities first. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { status, platform, sort } = await getValidatedQuery(event, Query.parse)
  const db = getDb(event)
  const [threads, { counts, pendingScoring }, learning] = await Promise.all([
    listThreads(db, project, { status, platform, sort, limit: 100 }),
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
