import { eq, schema } from '@mochiscout/db'

/** An existing user accepts pending invites for their email; the newest org becomes active. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  const db = getDb(event)
  const email = user.email.toLowerCase()
  const invites = await db.select().from(schema.orgInvites).where(eq(schema.orgInvites.email, email))
  if (!invites.length) throw createError({ statusCode: 404, statusMessage: 'No pending invites.' })
  const statements = [
    ...invites.map(i => db.insert(schema.orgMembers).values({ orgId: i.orgId, userId: user.id, role: 'member' }).onConflictDoNothing()),
    db.delete(schema.orgInvites).where(eq(schema.orgInvites.email, email)),
  ]
  await db.batch(statements as [typeof statements[number], ...typeof statements])
  return { joined: invites.length }
})
