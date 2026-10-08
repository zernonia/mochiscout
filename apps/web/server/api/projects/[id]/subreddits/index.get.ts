import { subredditMap } from '@social-radar/core'

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const env = getEnv(event)
  return {
    searchConfigured: Boolean(env.TINYFISH_API_KEY || env.BRAVE_API_KEY),
    subreddits: await subredditMap(getDb(event), project),
  }
})
