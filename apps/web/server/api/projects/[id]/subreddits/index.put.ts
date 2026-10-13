import { normalizeSubredditName } from '@mochiscout/core'
import { z } from 'zod'

const Body = z.object({ name: z.string().max(200), watching: z.boolean() })

/** Watch or unwatch a subreddit for this project (adds it to the RSS fetch schedule). */
export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const body = await readValidatedBody(event, Body.parse)
  const name = normalizeSubredditName(body.name)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Not a valid subreddit name' })
  const { watching } = body
  await setSubredditWatching(event, org, project.id, name, watching)
  return { name, watching }
})
