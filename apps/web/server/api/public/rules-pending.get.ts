import { eq, schema } from '@mochiscout/db'
import { getRules } from '@mochiscout/rules'

/**
 * Subreddits someone watches that the rules library doesn't have yet, for
 * the sync routine to add (names only, no counts or projects).
 */
export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const rows = await getDb(event).selectDistinct({ name: schema.projectSubreddits.subreddit }).from(schema.projectSubreddits)
    .where(eq(schema.projectSubreddits.watching, true))
  setHeader(event, 'Cache-Control', 'public, max-age=600')
  return { subreddits: rows.map(r => r.name).filter(name => !getRules(name)).sort() }
})
