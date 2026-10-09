import { and, eq, schema } from '@mochiscout/db'

/** Leave the active team (members only; the owner cannot leave their own team). */
export default defineEventHandler(async (event) => {
  const { user, org, role } = await requireUser(event)
  if (role === 'owner') throw createError({ statusCode: 400, statusMessage: 'The owner cannot leave their own team.' })
  await getDb(event).delete(schema.orgMembers).where(and(eq(schema.orgMembers.orgId, org.id), eq(schema.orgMembers.userId, user.id)))
  deleteCookie(event, ACTIVE_ORG_COOKIE, { path: '/' })
  return { ok: true }
})
