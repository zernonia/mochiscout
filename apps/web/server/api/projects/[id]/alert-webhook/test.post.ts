import { alertWebhookKind, postAlertWebhook, renderHotAlertWebhook } from '@mochiscout/core'

/** Send a sample hot-lead alert to the saved webhook. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const kind = project.alertWebhookUrl ? alertWebhookKind(project.alertWebhookUrl) : null
  if (!kind) throw createError({ statusCode: 400, statusMessage: 'Save a Slack or Discord webhook first.' })
  const body = renderHotAlertWebhook(kind, getRequestURL(event).origin, project, [{
    title: 'Test from Mochiscout: this is what a hot lead looks like',
    url: `${getRequestURL(event).origin}/app/${project.id}/inbox`,
    channel: null,
    platform: 'reddit',
    ageHours: 1,
    commentCount: 2,
    replyAngle: null,
    drafted: false,
  }])
  try {
    await postAlertWebhook(project.alertWebhookUrl!, body)
  }
  catch (error) {
    throw createError({ statusCode: 502, statusMessage: `${kind === 'slack' ? 'Slack' : 'Discord'} rejected the message (${String((error as Error).message)}). Check the webhook URL.` })
  }
  return { ok: true }
})
