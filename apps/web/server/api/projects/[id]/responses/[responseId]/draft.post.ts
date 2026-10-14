import { draftFollowUpForResponse, QuotaError, REPLY_DIRECTION_MAX } from '@mochiscout/core'
import { LlmParseError, LlmRefusalError } from '@mochiscout/llm'
import { z } from 'zod'

const Body = z.object({ direction: z.string().max(REPLY_DIRECTION_MAX).optional() }).optional()

/** Draft the founder's answer to someone who replied to them. Counts as one AI draft. */
export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const responseId = decodeURIComponent(getRouterParam(event, 'responseId')!)
  const body = await readValidatedBody(event, b => Body.parse(b ?? undefined))
  const llm = getLlm(getEnv(event))
  if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Set ANTHROPIC_API_KEY to draft replies.' })
  try {
    const draft = await draftFollowUpForResponse(getDb(event), llm, project, responseId, { direction: body?.direction?.trim() || null })
    if (!draft) throw createError({ statusCode: 404, statusMessage: 'Response not found' })
    track(event, user.id, 'follow_up_drafted', { project_id: project.id })
    return draft
  }
  catch (error) {
    if (error instanceof QuotaError) await quota(Promise.reject(error))
    if (error instanceof LlmRefusalError) throw createError({ statusCode: 502, statusMessage: 'The AI declined to draft this one. Try writing it yourself.', cause: error })
    if (error instanceof LlmParseError) throw createError({ statusCode: 502, statusMessage: 'The AI returned an incomplete draft. Please try again.', cause: error })
    throw error
  }
})
