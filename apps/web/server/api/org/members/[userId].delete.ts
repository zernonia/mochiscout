import { and, eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireOwner(event)
  const userId = getRouterParam(event, 'userId')!
  if (userId === user.id) throw createError({ statusCode: 400, statusMessage: 'The owner cannot be removed.' })
  await getDb(event).delete(schema.orgMembers).where(and(eq(schema.orgMembers.orgId, org.id), eq(schema.orgMembers.userId, userId)))
  setResponseStatus(event, 204)
  return null
})
