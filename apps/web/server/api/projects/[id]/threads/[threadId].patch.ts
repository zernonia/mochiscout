import { setThreadStatus } from '@mochiscout/core'
import { parseReplyUrl } from '@mochiscout/sources'
import { and, eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({
  status: z.enum(['new', 'saved', 'replied', 'dismissed']).optional(),
  /** Why it was dismissed; fit reasons calibrate future scoring. */
  dismissReason: z.enum(['off_topic', 'not_buyer', 'self_promo', 'already_answered', 'closed', 'other']).optional(),
  /** The user's edits to the drafted reply. */
  replyDraft: z.string().max(10_000).optional(),
  /** Link to the reply the user posted, to track whether it stays up. Null clears it. */
  replyUrl: z.string().max(2000).nullable().optional(),
}).refine(b => b.status !== undefined || b.replyDraft !== undefined || b.replyUrl !== undefined, 'Nothing to update')

export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const { status, replyDraft, dismissReason, replyUrl } = await readValidatedBody(event, Body.parse)
  const db = getDb(event)
  if (replyUrl !== undefined) {
    if (replyUrl && !parseReplyUrl(replyUrl)) {
      throw createError({ statusCode: 400, statusMessage: 'Paste the link to your reply itself (a Reddit comment, Hacker News comment, Bluesky post or X post).' })
    }
    await db.update(schema.threadScores)
      .set({ replyUrl: replyUrl || null, replyStatus: null, replyCheckedAt: null })
      .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId)))
    if (replyUrl) track(event, user.id, 'reply_link_added', { project_id: project.id })
  }
  if (replyDraft !== undefined) {
    await db.update(schema.threadScores)
      .set({ replyDraft })
      .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId)))
  }
  if (status === undefined) return { ok: true, replyUrl: replyUrl ?? undefined }
  const row = await setThreadStatus(db, project.id, threadId, status, dismissReason)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  track(event, user.id, 'thread_marked', { project_id: project.id, status, dismiss_reason: dismissReason ?? null })
  return row
})
