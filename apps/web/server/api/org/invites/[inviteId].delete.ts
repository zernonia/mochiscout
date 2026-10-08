import { and, eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { org } = await requireOwner(event)
  await getDb(event).delete(schema.orgInvites).where(and(
    eq(schema.orgInvites.id, getRouterParam(event, 'inviteId')!),
    eq(schema.orgInvites.orgId, org.id),
  ))
  setResponseStatus(event, 204)
  return null
})
