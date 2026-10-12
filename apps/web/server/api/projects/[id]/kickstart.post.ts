import { inboxCounts, runDiscovery, runFeedDiscovery, runScoring } from '@mochiscout/core'
import { z } from 'zod'

const Body = z.object({ step: z.enum(['discover', 'score']) })

/** Fresh-thread queries on the first run: enough to fill an inbox while the user waits. */
const FIRST_RUN_QUERIES = 6
const FIRST_RUN_TERMS = 2

/**
 * A project's first feed, while the user watches: "discover" searches for
 * recent threads (Reddit via web search, plus HN/Bluesky/X when enabled),
 * then "score" scores one batch per call so the UI can show progress. The
 * scheduled jobs take over afterwards.
 */
export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const { step } = await readValidatedBody(event, Body.parse)
  const ctx = createJobContext(getEnv(event), { budgetMs: 25_000 })
  const db = getDb(event)

  if (step === 'discover') {
    const [reddit, feeds] = await Promise.all([
      ctx.search ? runDiscovery(ctx, { projectIds: [project.id], mode: 'new', maxQueries: FIRST_RUN_QUERIES }) : null,
      project.sources.length ? runFeedDiscovery(ctx, { projectId: project.id, termsPerRun: FIRST_RUN_TERMS }) : null,
    ])
    const { pendingScoring } = await inboxCounts(db, project)
    return {
      searched: !!ctx.search,
      found: (reddit && 'newThreadIds' in reddit ? reddit.newThreadIds[project.id]?.length ?? 0 : 0)
        + (feeds && 'newPosts' in feeds ? feeds.newPosts : 0),
      pending: pendingScoring,
    }
  }

  if (!ctx.llm) return { scored: 0, pending: 0, leads: 0, llm: false }
  const res = await runScoring(ctx, { projectId: project.id, maxBatches: 1 })
  const { counts, pendingScoring } = await inboxCounts(db, project)
  const leads = counts.new ?? 0
  if (pendingScoring === 0) track(event, user.id, 'feed_ready', { project_id: project.id, leads })
  return { scored: 'scored' in res ? res.scored : 0, pending: pendingScoring, leads, llm: true }
})
