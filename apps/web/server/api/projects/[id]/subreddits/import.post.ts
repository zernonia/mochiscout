import { assertCanWatch, normalizeSubredditName, QuotaError } from '@mochiscout/core'
import { schema } from '@mochiscout/db'
import { getRules, RULES_VERSION } from '@mochiscout/rules'
import { z } from 'zod'

const Body = z.object({ text: z.string().max(10_000) })
const MAX = 100

/**
 * Watch many subreddits at once, e.g. pasted from GummySearch audiences.
 * Accepts names, r/names or links, separated by commas, spaces or lines.
 * Stops at the plan's limit and reports what was skipped.
 */
export default defineEventHandler(async (event) => {
  const { user, org, project } = await requireProject(event)
  const { text } = await readValidatedBody(event, Body.parse)
  const tokens = text.split(/[\s,;]+/).map(t => t.trim()).filter(Boolean)
  const names = [...new Set(tokens.map(t => normalizeSubredditName(t)).filter((n): n is string => !!n))].slice(0, MAX)
  const invalid = tokens.filter(t => !normalizeSubredditName(t)).slice(0, 10)

  const db = getDb(event)
  const added: string[] = []
  let limit: { message: string, upgradeTo: string | null } | null = null
  for (const name of names) {
    try {
      await assertCanWatch(db, org, name)
    }
    catch (error) {
      if (!(error instanceof QuotaError)) throw error
      limit = { message: error.message, upgradeTo: error.upgradeTo }
      break
    }
    const rules = getRules(name) ?? null
    await db.batch([
      db.insert(schema.subreddits).values({ name, rules, rulesVersion: rules ? RULES_VERSION : null })
        .onConflictDoUpdate({ target: schema.subreddits.name, set: { rules, rulesVersion: rules ? RULES_VERSION : null } }),
      db.insert(schema.projectSubreddits).values({ projectId: project.id, subreddit: name, watching: true })
        .onConflictDoUpdate({ target: [schema.projectSubreddits.projectId, schema.projectSubreddits.subreddit], set: { watching: true } }),
    ])
    added.push(name)
  }
  if (added.length) track(event, user.id, 'subreddits_imported', { project_id: project.id, count: added.length })
  readRulesInBackground(event, added)
  return { added, skipped: names.slice(added.length), invalid, limit }
})
