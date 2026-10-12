import { normalizeSubredditName, readMissingRules, resolveRules } from '@mochiscout/core'
import { z } from 'zod'

const Body = z.object({ name: z.string().max(200) })

/**
 * The free subreddit rules checker: rules for any subreddit. Subs outside the
 * rules library get their official rules read now (one page fetch and one
 * small LLM call), which also gives them a public page.
 */
export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const name = normalizeSubredditName((await readValidatedBody(event, Body.parse)).name)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'That doesn\'t look like a subreddit name. Try something like r/SaaS.' })
  const db = getDb(event)

  let resolved = await resolveRules(db, name)
  if (!resolved.rules && !resolved.readAt) {
    await limitFreeTool(event, 'rules', { perHour: 10, perDay: 300 })
    const ctx = createJobContext(getEnv(event), { budgetMs: 25_000 })
    if (!ctx.pages || !ctx.llm) throw createError({ statusCode: 503, statusMessage: 'Rule lookups are unavailable right now.' })
    const res = await readMissingRules(ctx, [name], { max: 1 })
    if (res.failed) throw createError({ statusCode: 502, statusMessage: `Couldn't reach r/${name} right now. Try again in a minute.` })
    resolved = await resolveRules(db, name)
  }
  if (!resolved.rules) {
    throw createError({ statusCode: 404, statusMessage: `r/${name} doesn't exist, is private, or publishes no rules we can read.` })
  }
  return { name, path: `/subreddits/${name}` }
})
