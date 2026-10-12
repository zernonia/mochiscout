import type { H3Event } from 'h3'
import { readMissingRules } from '@mochiscout/core'

/**
 * Read the official rules of newly watched subs that the rules library
 * doesn't have yet, after the response is sent, so the Subreddits page shows
 * them within seconds. The daily job catches anything missed.
 */
export function readRulesInBackground(event: H3Event, names: string[], max = 2) {
  if (!names.length) return
  const ctx = createJobContext(getEnv(event), { budgetMs: 25_000 })
  const task = readMissingRules(ctx, names, { max })
    .catch(error => ctx.log('subreddit rules failed', { error: String(error) }))
  if (typeof event.waitUntil === 'function') event.waitUntil(task)
}
