import { inboxCounts, listThreads } from '@social-radar/core'
import { z } from 'zod'

const Query = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).default('new'),
})

/** Intent-scored threads at or above the project's threshold. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { status } = await getValidatedQuery(event, Query.parse)
  const db = getDb(event)
  const [threads, { counts, pendingScoring }] = await Promise.all([
    listThreads(db, project, { status }),
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
