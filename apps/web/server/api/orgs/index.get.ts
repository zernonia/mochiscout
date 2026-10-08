import { eq, schema } from '@social-radar/db'

/** Teams the user belongs to, for the switcher. Orgs are labelled by their owner. */
export default defineEventHandler(async (event) => {
  const { user, org: active } = await requireUser(event)
  const db = getDb(event)
  const rows = await db
    .select({ id: schema.orgs.id, plan: schema.orgs.plan, role: schema.orgMembers.role, ownerEmail: schema.users.email })
    .from(schema.orgMembers)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.orgMembers.orgId))
    .innerJoin(schema.users, eq(schema.users.id, schema.orgs.ownerId))
    .where(eq(schema.orgMembers.userId, user.id))
  return rows.map(r => ({
    ...r,
    label: r.role === 'owner' ? 'Your team' : `${r.ownerEmail}'s team`,
    active: r.id === active.id,
  }))
})
