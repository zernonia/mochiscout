import { assertCanAddSeat } from '@social-radar/core'
import { and, eq, schema } from '@social-radar/db'
import { z } from 'zod'

const Body = z.object({ email: z.email().max(320) })

/** Invite a teammate (owner only). They join this org when they sign in with that email. */
export default defineEventHandler(async (event) => {
  const { org, user } = await requireOwner(event)
  const email = (await readValidatedBody(event, Body.parse)).email.toLowerCase()
  const db = getDb(event)

  const member = await db.select({ id: schema.users.id }).from(schema.users)
    .innerJoin(schema.orgMembers, and(eq(schema.orgMembers.userId, schema.users.id), eq(schema.orgMembers.orgId, org.id)))
    .where(eq(schema.users.email, email)).get()
  if (member) throw createError({ statusCode: 409, statusMessage: 'Already a member.' })
  const pending = await db.select({ id: schema.orgInvites.id }).from(schema.orgInvites)
    .where(and(eq(schema.orgInvites.orgId, org.id), eq(schema.orgInvites.email, email))).get()
  if (pending) throw createError({ statusCode: 409, statusMessage: 'Already invited.' })

  await quota(assertCanAddSeat(db, org))
  const [invite] = await db.insert(schema.orgInvites)
    .values({ id: crypto.randomUUID(), orgId: org.id, email, invitedBy: user.id })
    .returning()

  const env = getEnv(event)
  const appUrl = env.APP_URL ?? getRequestURL(event).origin
  event.waitUntil(sendEmail(env, {
    to: email,
    subject: `${user.email} invited you to social-radar`,
    text: `${user.email} invited you to their social-radar team.\n\nSign in with this email address to join: ${appUrl}/login`,
    html: `<p>${user.email} invited you to their social-radar team.</p><p><a href="${appUrl}/login">Sign in with this email address to join</a>.</p>`,
  }).catch(error => console.error('[invite] email failed', error)))

  setResponseStatus(event, 201)
  return invite
})
