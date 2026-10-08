import { eq, schema } from '@social-radar/db'

/** Pending invites for the signed-in user's email. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  return getDb(event)
    .select({ id: schema.orgInvites.id, invitedBy: schema.users.email })
    .from(schema.orgInvites)
    .leftJoin(schema.users, eq(schema.users.id, schema.orgInvites.invitedBy))
    .where(eq(schema.orgInvites.email, user.email.toLowerCase()))
})
