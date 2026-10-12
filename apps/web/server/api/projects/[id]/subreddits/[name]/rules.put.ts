import { CustomRules, normalizeSubredditName, resolveRules } from '@mochiscout/core'
import { schema } from '@mochiscout/db'
import { getRules, RULES_VERSION } from '@mochiscout/rules'
import { z } from 'zod'

const Body = z.object({ rules: CustomRules.nullable() })

/**
 * Save this project's own copy of a sub's rules (drafts and checks follow it
 * instead of the rules library), or `null` to go back to the library.
 */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const name = normalizeSubredditName(String(getRouterParam(event, 'name') ?? ''))
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Not a valid subreddit name' })
  const { rules } = await readValidatedBody(event, Body.parse)
  const db = getDb(event)
  const at = rules ? new Date() : null
  const library = getRules(name) ?? null
  await db.batch([
    db.insert(schema.subreddits).values({ name, rules: library, rulesVersion: library ? RULES_VERSION : null }).onConflictDoNothing(),
    db.insert(schema.projectSubreddits)
      .values({ projectId: project.id, subreddit: name, rulesOverride: rules, rulesOverrideAt: at })
      .onConflictDoUpdate({
        target: [schema.projectSubreddits.projectId, schema.projectSubreddits.subreddit],
        set: { rulesOverride: rules, rulesOverrideAt: at },
      }),
  ])
  const resolved = await resolveRules(db, name, project.id)
  return { name, rules: resolved.rules, rulesSource: resolved.source, libraryRules: resolved.library }
})
