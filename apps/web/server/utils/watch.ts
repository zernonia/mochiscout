import type { H3Event } from 'h3'
import { assertCanWatch } from '@mochiscout/core'
import { schema } from '@mochiscout/db'
import { getRules, RULES_VERSION } from '@mochiscout/rules'

/**
 * Watch or unwatch a subreddit for a project (watching adds it to the feed
 * schedule and reads its rules if they aren't known). Plan limits throw 402.
 */
export async function setSubredditWatching(event: H3Event, org: Parameters<typeof assertCanWatch>[1], projectId: string, name: string, watching: boolean) {
  const db = getDb(event)
  if (watching) await quota(assertCanWatch(db, org, name))
  const rules = getRules(name) ?? null
  await db.batch([
    db.insert(schema.subreddits)
      .values({ name, rules, rulesVersion: rules ? RULES_VERSION : null })
      .onConflictDoUpdate({ target: schema.subreddits.name, set: { rules, rulesVersion: rules ? RULES_VERSION : null } }),
    db.insert(schema.projectSubreddits)
      .values({ projectId, subreddit: name, watching })
      .onConflictDoUpdate({
        target: [schema.projectSubreddits.projectId, schema.projectSubreddits.subreddit],
        set: { watching },
      }),
  ])
  if (watching) readRulesInBackground(event, [name])
}
