import { draftDmForThread, QuotaError } from '@mochiscout/core'
import { LlmParseError, LlmRefusalError } from '@mochiscout/llm'

/**
 * Draft a private message to a post's author who invited DMs. Returned, not
 * stored: the founder copies it and sends it themselves. Counts as one AI draft.
 */
export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const llm = getLlm(getEnv(event))
  if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Set ANTHROPIC_API_KEY to draft messages.' })
  try {
    const draft = await draftDmForThread(getDb(event), llm, project, threadId)
    if (!draft) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
    track(event, user.id, 'dm_drafted', { project_id: project.id })
    return draft
  }
  catch (error) {
    if (error instanceof QuotaError) await quota(Promise.reject(error))
    if (error instanceof LlmRefusalError) throw createError({ statusCode: 502, statusMessage: 'The AI declined to draft this message. Try writing it yourself.', cause: error })
    if (error instanceof LlmParseError) throw createError({ statusCode: 502, statusMessage: 'The AI returned an incomplete draft. Please try again.', cause: error })
    throw error
  }
})
