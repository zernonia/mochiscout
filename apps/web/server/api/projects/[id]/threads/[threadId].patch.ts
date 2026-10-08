import { and, eq, schema } from '@social-radar/db'
import { z } from 'zod'

const Body = z.object({ status: z.enum(['new', 'saved', 'replied', 'dismissed']) })

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const { status } = await readValidatedBody(event, Body.parse)
  const [row] = await getDb(event)
    .update(schema.threadScores)
    .set({ status })
    .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId)))
    .returning({ threadId: schema.threadScores.threadId, status: schema.threadScores.status })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  return row
})
