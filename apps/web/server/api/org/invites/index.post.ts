import { assertCanAddSeat } from '@mochiscout/core'
import { and, eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({ email: z.email().max(320) })

/**
 * Invite a teammate (owner only). They join after signing in with GitHub or
 * Google on that email address (a verified email), and accepting in Settings
 * on the hosted edition. Limited per org per day so invites can't be used to
 * send email to arbitrary addresses.
 */
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

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
  await rateLimit(event, `invites:${org.id}`, { max: 20, windowSeconds: 86_400, message: 'You sent a lot of invites today. Try again tomorrow.' })
  const [invite] = await db.insert(schema.orgInvites)
    .values({ id: crypto.randomUUID(), orgId: org.id, email, invitedBy: user.id })
    .returning()

  const env = getEnv(event)
  const appUrl = env.APP_URL ?? getRequestURL(event).origin
  event.waitUntil(sendEmail(env, {
    to: email,
    subject: `${user.email} invited you to Mochiscout`,
    text: `${user.email} invited you to their Mochiscout team.\n\nSign in with GitHub or Google using this email address to join: ${appUrl}/login`,
    html: `<p>${escapeHtml(user.email)} invited you to their Mochiscout team.</p><p><a href="${escapeHtml(`${appUrl}/login`)}">Sign in with GitHub or Google using this email address to join</a>.</p>`,
  }).catch(error => console.error('[invite] email failed', error)))

  setResponseStatus(event, 201)
  return invite
})
