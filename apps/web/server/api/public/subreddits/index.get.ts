import { publicSubreddits } from '@mochiscout/core'

/** Subreddits with a public page (hosted edition), busiest first. */
export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  setHeader(event, 'Cache-Control', 'public, max-age=600')
  const subs = await publicSubreddits(getDb(event))
  return subs.map(s => ({ name: s.name, description: s.description, posts30d: s.stats.posts30d, buyingPosts30d: s.stats.buyingPosts30d, grade: s.verdict.grade, indexable: s.indexable }))
})
