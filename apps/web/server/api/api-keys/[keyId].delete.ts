import { and, eq, schema } from '@mochiscout/db'

export default defineEventHandler(async (event) => {
  const { user, org } = await requireUser(event)
  await getDb(event).delete(schema.apiKeys).where(and(
    eq(schema.apiKeys.id, getRouterParam(event, 'keyId')!),
    eq(schema.apiKeys.orgId, org.id),
    eq(schema.apiKeys.userId, user.id),
  ))
  setResponseStatus(event, 204)
  return null
})
