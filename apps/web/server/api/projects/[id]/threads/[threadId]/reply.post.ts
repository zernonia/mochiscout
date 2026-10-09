import { draftReplyForThread, ThreadClosedError } from '@mochiscout/core'

/**
 * Draft (or redraft) a reply to one inbox thread. The thread's full text and
 * replies are fetched first; a thread that can't be answered any more returns
 * 409 with its state. The user edits and posts the reply themselves.
 */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const llm = getLlm(getEnv(event))
  if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Set ANTHROPIC_API_KEY to draft replies.' })
  try {
    const draft = await draftReplyForThread(getDb(event), llm, project, threadId, { tier: 'quality', http: requestHttp(event) })
    if (!draft) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
    return draft
  }
  catch (error) {
    if (error instanceof ThreadClosedError) {
      throw createError({ statusCode: 409, statusMessage: error.message, data: { state: error.state } })
    }
    throw error
  }
})
