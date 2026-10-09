import { draftReplyForThread } from '@mochiscout/core'

/** Draft (or redraft) a reply to one inbox thread. The user edits and posts it themselves. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const llm = getLlm(getEnv(event))
  if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Set ANTHROPIC_API_KEY to draft replies.' })
  const draft = await draftReplyForThread(getDb(event), llm, project, threadId, 'quality')
  if (!draft) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  return draft
})
