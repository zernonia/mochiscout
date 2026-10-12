import { assertCanWatch, normalizeSubredditName } from '@mochiscout/core'
import { schema } from '@mochiscout/db'
import { getRules, RULES_VERSION } from '@mochiscout/rules'
import { z } from 'zod'

const Body = z.object({ name: z.string().max(200), watching: z.boolean() })

/** Watch or unwatch a subreddit for this project (adds it to the RSS fetch schedule). */
export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const body = await readValidatedBody(event, Body.parse)
  const name = normalizeSubredditName(body.name)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Not a valid subreddit name' })
  const { watching } = body

  const db = getDb(event)
  if (watching) await quota(assertCanWatch(db, org, name))
  const rules = getRules(name) ?? null
  await db.batch([
    db.insert(schema.subreddits)
      .values({ name, rules, rulesVersion: rules ? RULES_VERSION : null })
      .onConflictDoUpdate({ target: schema.subreddits.name, set: { rules, rulesVersion: rules ? RULES_VERSION : null } }),
    db.insert(schema.projectSubreddits)
      .values({ projectId: project.id, subreddit: name, watching })
      .onConflictDoUpdate({
        target: [schema.projectSubreddits.projectId, schema.projectSubreddits.subreddit],
        set: { watching },
      }),
  ])
  if (watching) readRulesInBackground(event, [name])
  return { name, watching }
})
