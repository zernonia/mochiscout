import { inboxCounts, listThreads } from '@social-radar/core'
import { z } from 'zod'

const Query = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).default('new'),
  platform: z.enum(['reddit', 'hn', 'bluesky', 'x']).optional(),
})

/** Intent-scored threads at or above the project's threshold. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { status, platform } = await getValidatedQuery(event, Query.parse)
  const db = getDb(event)
  const [threads, { counts, pendingScoring }] = await Promise.all([
    listThreads(db, project, { status, platform }),
    inboxCounts(db, project),
  ])
  return {
    threshold: project.intentThreshold,
    pendingScoring,
    llmConfigured: getLlm(getEnv(event)) !== null,
    counts,
    threads,
  }
})
