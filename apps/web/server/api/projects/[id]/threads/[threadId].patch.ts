import { setThreadStatus } from '@mochiscout/core'
import { and, eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).optional(),
  /** The user's edits to the drafted reply. */
  replyDraft: z.string().max(10_000).optional(),
}).refine(b => b.status !== undefined || b.replyDraft !== undefined, 'Nothing to update')

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const { status, replyDraft } = await readValidatedBody(event, Body.parse)
  const db = getDb(event)
  if (replyDraft !== undefined) {
    await db.update(schema.threadScores)
      .set({ replyDraft })
      .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId)))
  }
  if (status === undefined) return { ok: true }
  const row = await setThreadStatus(db, project.id, threadId, status)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  return row
})
