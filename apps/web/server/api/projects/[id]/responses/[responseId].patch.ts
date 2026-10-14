import { and, eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({
  status: z.enum(['new', 'done']).optional(),
  followUp: z.string().max(4000).optional(),
})

/** Mark a response to the founder's reply as handled, or save their edits to the follow-up. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const responseId = decodeURIComponent(getRouterParam(event, 'responseId')!)
  const body = await readValidatedBody(event, Body.parse)
  // Only the keys that were sent (see AGENTS.md on partial updates).
  const set = {
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.followUp !== undefined ? { followUp: body.followUp } : {}),
  }
  if (!Object.keys(set).length) return { ok: true }
  const rr = schema.replyResponses
  const [row] = await getDb(event).update(rr).set(set)
    .where(and(eq(rr.projectId, project.id), eq(rr.id, responseId)))
    .returning({ id: rr.id })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Response not found' })
  return { ok: true }
})
