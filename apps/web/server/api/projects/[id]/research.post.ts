import { assertCanRunResearch, runResearch } from '@mochiscout/core'

/** Start a research run in the background. */
export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const env = getEnv(event)
  const ctx = createJobContext(env)
  if (!ctx.llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Set ANTHROPIC_API_KEY.' })

  await quota(assertCanRunResearch(getDb(event), org))

  const lock = researchLockKey(project.id)
  if (await env.CACHE.get(lock)) throw createError({ statusCode: 409, statusMessage: 'Research is already running.' })
  await env.CACHE.put(lock, '1', { expirationTtl: 600 })

  event.waitUntil(
    runResearch(ctx, project.id)
      .then(result => ctx.log('research done', result))
      .catch(error => ctx.log('research failed', { error: String(error) }))
      .finally(() => env.CACHE.delete(lock)),
  )
  setResponseStatus(event, 202)
  return { started: true }
})
