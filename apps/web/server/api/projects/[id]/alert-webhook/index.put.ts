import { alertWebhookKind, assertHotAlerts } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({ url: z.string().max(500).nullable() })

/** Save (or clear) the Slack or Discord webhook for hot-lead alerts (Solo and Pro). */
export default defineEventHandler(async (event) => {
  const { user, org, project } = await requireProject(event)
  const { url } = await readValidatedBody(event, Body.parse)
  const value = url?.trim() || null
  if (value) {
    await quota(() => assertHotAlerts(org))
    if (!alertWebhookKind(value)) {
      throw createError({ statusCode: 400, statusMessage: 'Paste a Slack incoming-webhook URL (https://hooks.slack.com/services/…) or a Discord webhook URL (https://discord.com/api/webhooks/…).' })
    }
  }
  await getDb(event).update(schema.projects).set({ alertWebhookUrl: value }).where(eq(schema.projects.id, project.id))
  if (value) track(event, user.id, 'alert_webhook_set', { project_id: project.id, kind: alertWebhookKind(value) })
  return { url: value, kind: value ? alertWebhookKind(value) : null }
})
