import { setThreadStatus } from '@social-radar/core'
import { z } from 'zod'

const Body = z.object({ status: z.enum(['new', 'saved', 'replied', 'dismissed']) })

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const threadId = decodeURIComponent(getRouterParam(event, 'threadId')!)
  const { status } = await readValidatedBody(event, Body.parse)
  const row = await setThreadStatus(getDb(event), project.id, threadId, status)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })
  return row
})
