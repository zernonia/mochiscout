import { latestPainPoints } from '@social-radar/core'

/** Latest research run's pain points, and whether a run is in progress. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const env = getEnv(event)
  const { ranAt, points } = await latestPainPoints(getDb(event), project.id)
  return {
    llmConfigured: getLlm(env) !== null,
    searchConfigured: Boolean(env.TINYFISH_API_KEY || env.BRAVE_API_KEY),
    running: (await env.CACHE.get(researchLockKey(project.id))) !== null,
    ranAt,
    points,
  }
})
