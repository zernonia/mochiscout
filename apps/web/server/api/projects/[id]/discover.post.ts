import { runDiscovery } from '@social-radar/core'

/** Run search discovery for this project now, in the background. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const env = getEnv(event)
  const ctx = createJobContext(env)
  if (!ctx.search) {
    throw createError({ statusCode: 503, statusMessage: 'No search provider configured. Set TINYFISH_API_KEY (free) or BRAVE_API_KEY.' })
  }
  event.waitUntil(runDiscovery(ctx, { projectIds: [project.id] }).catch(error => ctx.log('discovery failed', { error: String(error) })))
  setResponseStatus(event, 202)
  return { started: true }
})
