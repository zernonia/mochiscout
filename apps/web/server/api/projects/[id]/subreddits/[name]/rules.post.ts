import { normalizeSubredditName, refreshSubredditRules, resolveRules } from '@mochiscout/core'

/** Re-read a sub's official rules now (at most every 10 minutes per sub). */
export default defineEventHandler(async (event) => {
  await requireProject(event)
  const name = normalizeSubredditName(String(getRouterParam(event, 'name') ?? ''))
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Not a valid subreddit name' })
  const ctx = createJobContext(getEnv(event), { budgetMs: 25_000 })
  if (!ctx.llm) throw createError({ statusCode: 503, statusMessage: 'Set ANTHROPIC_API_KEY to read subreddit rules.' })
  const result = await refreshSubredditRules(ctx, [name], { force: true, max: 1 })
  if (result.failed) throw createError({ statusCode: 502, statusMessage: `Couldn't read r/${name}'s rules right now. Try again in a few minutes.` })
  const resolved = await resolveRules(getDb(event), name)
  return { name, read: result.read > 0, rules: resolved.rules, rulesSource: resolved.source, rulesCheckedAt: resolved.checkedAt }
})
