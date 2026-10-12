import { ensureRefCode, refLink } from '@mochiscout/core'

/** The thread's tracking link: the project's own URL with ?ref=ms_<code>. */
export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const code = await ensureRefCode(getDb(event), project.id, threadId)
  if (!code) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  track(event, user.id, 'tracking_link_copied', { project_id: project.id })
  return { code, link: refLink(project.url, code) }
})
