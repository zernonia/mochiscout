import { assertCanWatch, inboxCounts, QuotaError, runDiscovery, runFeedDiscovery, runScoring, subredditMap } from '@mochiscout/core'
import { and, eq, schema } from '@mochiscout/db'
import { getRules, RULES_VERSION } from '@mochiscout/rules'
import { z } from 'zod'

const Body = z.object({ step: z.enum(['discover', 'score', 'watch']) })

/** Fresh-thread queries on the first run: enough to fill an inbox while the user waits. */
const FIRST_RUN_QUERIES = 6
const FIRST_RUN_TERMS = 2
/** Subreddits watched automatically after the first feed (within the plan's limit). */
const FIRST_RUN_WATCH = 5
/** Minimum fit for a sub to be watched without asking. */
const AUTO_WATCH_MIN_FIT = 40

/**
 * A project's first feed, while the user watches: "discover" searches for
 * recent threads (Reddit via web search, plus HN/Bluesky/X when enabled),
 * then "score" scores one batch per call so the UI can show progress, then
 * "watch" starts watching the best-fitting subreddits it found so new posts
 * keep arriving. The scheduled jobs take over afterwards.
 */
export default defineEventHandler(async (event) => {
  const { user, org, project } = await requireProject(event)
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

  if (step === 'watch') {
    const ps = schema.projectSubreddits
    const already = await db.select({ s: ps.subreddit }).from(ps).where(and(eq(ps.projectId, project.id), eq(ps.watching, true)))
    if (already.length) return { watched: [] as string[] }
    const candidates = (await subredditMap(db, project))
      .filter(c => !c.watching && (c.evidence.hits > 0 || c.sources.includes('rules')) && c.fit >= AUTO_WATCH_MIN_FIT)
      .slice(0, FIRST_RUN_WATCH)
    const watched: string[] = []
    for (const c of candidates) {
      try {
        await assertCanWatch(db, org, c.name)
      }
      catch (error) {
        if (error instanceof QuotaError) break
        throw error
      }
      const rules = getRules(c.name) ?? null
      await db.batch([
        db.insert(schema.subreddits).values({ name: c.name, rules, rulesVersion: rules ? RULES_VERSION : null })
          .onConflictDoUpdate({ target: schema.subreddits.name, set: { rules, rulesVersion: rules ? RULES_VERSION : null } }),
        db.insert(ps).values({ projectId: project.id, subreddit: c.name, watching: true, fitScore: c.fit })
          .onConflictDoUpdate({ target: [ps.projectId, ps.subreddit], set: { watching: true, fitScore: c.fit } }),
      ])
      watched.push(c.name)
    }
    if (watched.length) {
      readRulesInBackground(event, watched)
      track(event, user.id, 'subreddits_auto_watched', { project_id: project.id, count: watched.length })
    }
    return { watched }
  }

  if (!ctx.llm) return { scored: 0, pending: 0, leads: 0, llm: false }
  const res = await runScoring(ctx, { projectId: project.id, maxBatches: 1 })
  const { counts, pendingScoring } = await inboxCounts(db, project)
  const leads = counts.new ?? 0
  if (pendingScoring === 0) track(event, user.id, 'feed_ready', { project_id: project.id, leads })
  return { scored: 'scored' in res ? res.scored : 0, pending: pendingScoring, leads, llm: true }
})
