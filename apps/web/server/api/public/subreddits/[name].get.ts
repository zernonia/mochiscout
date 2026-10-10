import { publicSubreddits } from '@mochiscout/core'

/** One subreddit's public page data: rules, pooled outcomes, activity. */
export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const name = String(getRouterParam(event, 'name') ?? '').toLowerCase()
  if (!/^\w{2,21}$/.test(name)) throw createError({ statusCode: 404 })
  const db = getDb(event)
  const [sub] = await publicSubreddits(db, { name })
  if (!sub) throw createError({ statusCode: 404, statusMessage: 'No page for this subreddit yet' })
  const related = (await publicSubreddits(db)).filter(s => s.name !== name && s.indexable).slice(0, 8).map(s => ({ name: s.name, grade: s.verdict.grade }))
  setHeader(event, 'Cache-Control', 'public, max-age=600')
  return { ...sub, related }
})
