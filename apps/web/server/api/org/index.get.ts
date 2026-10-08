import { eq, schema } from '@social-radar/db'

/** Members and pending invites of the active org. */
export default defineEventHandler(async (event) => {
  const { org, role, user } = await requireUser(event)
  const db = getDb(event)
  const [members, invites] = await Promise.all([
    db.select({ userId: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.orgMembers.role })
      .from(schema.orgMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMembers.userId))
      .where(eq(schema.orgMembers.orgId, org.id)),
    db.select({ id: schema.orgInvites.id, email: schema.orgInvites.email, createdAt: schema.orgInvites.createdAt })
      .from(schema.orgInvites).where(eq(schema.orgInvites.orgId, org.id)),
  ])
  return { role, me: user.id, members, invites }
})
