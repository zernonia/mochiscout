import { assertAutoReplies } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({ enabled: z.boolean() })

/** Turn automatic reply drafts on or off for a project (Solo and Pro plans). */
export default defineEventHandler(async (event) => {
  const { project, org } = await requireProject(event)
  const { enabled } = await readValidatedBody(event, Body.parse)
  if (enabled) await quota(() => assertAutoReplies(org))
  await getDb(event).update(schema.projects).set({ autoReply: enabled }).where(eq(schema.projects.id, project.id))
  return { autoReply: enabled }
})
