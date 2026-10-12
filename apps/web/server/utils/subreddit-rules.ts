import type { H3Event } from 'h3'
import { refreshSubredditRules } from '@mochiscout/core'

/**
 * Read the official rules of subs a user just started watching, after the
 * response is sent, so the Subreddits page shows them on its next load.
 * Only subs with missing or stale rules are read.
 */
export function readRulesInBackground(event: H3Event, names: string[], max = 5) {
  if (!names.length) return
  const ctx = createJobContext(getEnv(event), { budgetMs: 25_000 })
  const task = refreshSubredditRules(ctx, names, { max })
    .catch(error => ctx.log('subreddit rules failed', { error: String(error) }))
  if (typeof event.waitUntil === 'function') event.waitUntil(task)
}
