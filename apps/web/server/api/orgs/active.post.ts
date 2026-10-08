import { and, eq, schema } from '@social-radar/db'
import { z } from 'zod'

const Body = z.object({ orgId: z.string().max(64) })

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  const { orgId } = await readValidatedBody(event, Body.parse)
  const member = await getDb(event).select({ role: schema.orgMembers.role }).from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.userId, user.id))).get()
  if (!member) throw createError({ statusCode: 403, statusMessage: 'Not a member of that team' })
  setCookie(event, ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 365 * 86_400 })
  return { ok: true }
})
