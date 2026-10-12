import { draftReplyForThread, QuotaError, ThreadClosedError } from '@mochiscout/core'
import { LlmParseError, LlmRefusalError } from '@mochiscout/llm'

/**
 * Draft (or redraft) a reply to one inbox thread. The thread's full text and
 * replies are fetched first; a thread that can't be answered any more returns
 * 409 with its state. The user edits and posts the reply themselves.
 */
export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const llm = getLlm(getEnv(event))
  if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Set ANTHROPIC_API_KEY to draft replies.' })
  try {
    const draft = await draftReplyForThread(getDb(event), llm, project, threadId, { http: requestHttp(event) })
    if (!draft) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
    track(event, user.id, 'reply_drafted', { project_id: project.id, auto: false })
    return draft
  }
  catch (error) {
    // Out of AI drafts this month: 402 with the upgrade offer.
    if (error instanceof QuotaError) await quota(Promise.reject(error))
    if (error instanceof ThreadClosedError) {
      throw createError({ statusCode: 409, statusMessage: error.message, data: { state: error.state } })
    }
    // Model failures: say what happened instead of a bare 500 (still reported as a 5xx).
    if (error instanceof LlmRefusalError) {
      throw createError({ statusCode: 502, statusMessage: 'The AI declined to draft a reply for this thread. Try writing it yourself.', cause: error })
    }
    if (error instanceof LlmParseError) {
      throw createError({ statusCode: 502, statusMessage: 'The AI returned an incomplete draft. Please try again.', cause: error })
    }
    throw error
  }
})
