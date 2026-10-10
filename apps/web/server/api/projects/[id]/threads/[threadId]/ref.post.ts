import { ensureRefCode, refLink } from '@mochiscout/core'

/** The thread's tracking link: the project's own URL with ?ref=ms_<code>. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const code = await ensureRefCode(getDb(event), project.id, threadId)
  if (!code) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  return { code, link: refLink(project.url, code) }
})
