import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { and, count, eq, schema } from '@mochiscout/db'

type Db = ReturnType<typeof getDb>
type User = typeof schema.users.$inferSelect

export class AuthError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message)
  }
}

function editionOf(event: RequestEvent) {
  const config = useRuntimeConfig(event).public
  return { edition: config.edition, waitlist: Boolean(config.waitlist) }
}

/**
 * Who may create an account:
 * - Self-host: the first user, then invited emails or ALLOWED_EMAILS.
 * - Cloud: anyone, unless waitlist mode is on (then invited or ALLOWED_EMAILS).
 * Invites only count for verified emails (GitHub/Google), so nobody can claim
 * an invite by typing someone else's address into the password form.
 */
async function assertCanSignUp(event: RequestEvent, db: Db, email: string, emailVerified: boolean) {
  const { edition, waitlist } = editionOf(event)
  if (edition !== 'selfhost' && !waitlist) return
  const allowed = (getEnv(event).ALLOWED_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (allowed.includes(email)) return
  if (emailVerified) {
    const invited = await db.select({ id: schema.orgInvites.id }).from(schema.orgInvites).where(eq(schema.orgInvites.email, email)).get()
    if (invited) return
  }
  const [row] = await db.select({ n: count() }).from(schema.users)
  if (edition === 'selfhost' && (row?.n ?? 0) === 0) return
  throw new AuthError(403, edition === 'selfhost' ? 'Sign-ups are closed on this instance.' : 'We are in private beta. Join the waitlist on the home page.')
}

/** New users join the org that invited them (verified email only), the single self-host org, or get their own. */
async function setUpMembership(event: RequestEvent, db: Db, user: { id: string, email: string, emailVerified: boolean }) {
  const { edition } = editionOf(event)
  const invite = user.emailVerified
    ? await db.select().from(schema.orgInvites).where(eq(schema.orgInvites.email, user.email)).get()
    : undefined
  const existingOrg = edition === 'selfhost' ? await db.select({ id: schema.orgs.id }).from(schema.orgs).get() : undefined
  const joinOrgId = invite?.orgId ?? existingOrg?.id

  if (joinOrgId) {
    await db.batch([
      db.insert(schema.orgMembers).values({ orgId: joinOrgId, userId: user.id, role: 'member' }).onConflictDoNothing(),
      db.delete(schema.orgInvites).where(eq(schema.orgInvites.email, user.email)),
    ])
    return
  }
  const orgId = crypto.randomUUID()
  await db.batch([
    db.insert(schema.orgs).values({ id: orgId, ownerId: user.id, plan: edition === 'selfhost' ? 'selfhost' : 'free' }),
    db.insert(schema.orgMembers).values({ orgId, userId: user.id, role: 'owner' }),
  ])
}

async function createUser(event: RequestEvent, db: Db, input: { email: string, name: string, image?: string | null, emailVerified: boolean }) {
  await assertCanSignUp(event, db, input.email, input.emailVerified)
  const [user] = await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name,
    image: input.image ?? null,
    emailVerified: input.emailVerified,
  }).returning()
  await setUpMembership(event, db, user!)
  track(event as Parameters<typeof track>[0], user!.id, 'signed_up', { method: input.emailVerified ? 'oauth' : 'password' })
  return user!
}

export async function startSession(event: RequestEvent, user: User) {
  await replaceUserSession(event, {
    user: { id: user.id, email: user.email, name: user.name, image: user.image },
    loggedInAt: Date.now(),
  })
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function signUpWithPassword(event: RequestEvent, input: { email: string, password: string, name?: string }) {
  const db = getDb(event)
  const email = normalizeEmail(input.email)
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).get()
  if (existing) throw new AuthError(409, 'An account with this email already exists. Sign in instead.')
  const user = await createUser(event, db, { email, name: input.name?.trim() || email.split('@')[0]!, emailVerified: false })
  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: await hashPassword(input.password),
  })
  return user
}

export async function signInWithPassword(event: RequestEvent, input: { email: string, password: string }) {
  const db = getDb(event)
  const email = normalizeEmail(input.email)
  const row = await db.select({ user: schema.users, password: schema.accounts.password })
    .from(schema.users)
    .innerJoin(schema.accounts, and(eq(schema.accounts.userId, schema.users.id), eq(schema.accounts.providerId, 'credential')))
    .where(eq(schema.users.email, email))
    .get()
  // Same message for unknown email and wrong password.
  if (!row?.password || !(await verifyPassword(row.password, input.password))) {
    throw new AuthError(401, 'Wrong email or password.')
  }
  return row.user
}

/**
 * Sign in with GitHub or Google. Links to an existing account with the same
 * email only when the provider says the email is verified; a password set on
 * an unverified account is removed at that point, so whoever registered the
 * address first cannot keep a way in.
 */
export async function signInWithOAuth(event: RequestEvent, profile: {
  provider: 'github' | 'google'
  providerAccountId: string
  email: string | null | undefined
  emailVerified: boolean
  name: string | null | undefined
  image: string | null | undefined
}) {
  const db = getDb(event)
  const linked = await db.select({ user: schema.users }).from(schema.accounts)
    .innerJoin(schema.users, eq(schema.users.id, schema.accounts.userId))
    .where(and(eq(schema.accounts.providerId, profile.provider), eq(schema.accounts.accountId, profile.providerAccountId)))
    .get()
  if (linked) return linked.user

  if (!profile.email) throw new AuthError(400, `Your ${profile.provider} account has no email address we can use.`)
  if (!profile.emailVerified) throw new AuthError(400, `Verify your email with ${profile.provider} first, then try again.`)
  const email = normalizeEmail(profile.email)

  let user = await db.select().from(schema.users).where(eq(schema.users.email, email)).get()
  if (user) {
    const statements = [
      db.update(schema.users).set({ emailVerified: true, image: user.image ?? profile.image ?? null, updatedAt: new Date() }).where(eq(schema.users.id, user.id)),
      ...(user.emailVerified ? [] : [db.delete(schema.accounts).where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'credential')))]),
    ]
    await db.batch(statements as [typeof statements[number], ...typeof statements])
    user = { ...user, emailVerified: true }
  }
  else {
    user = await createUser(event, db, { email, name: profile.name || email.split('@')[0]!, image: profile.image, emailVerified: true })
  }
  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    accountId: profile.providerAccountId,
    providerId: profile.provider,
    userId: user.id,
  })
  return user
}

/** Login attempts per IP + email, to slow down password guessing. */
export async function rateLimitAuth(event: RequestEvent, email: string) {
  const env = getEnv(event)
  const ip = getRequestHeader(event, 'cf-connecting-ip') ?? getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `auth:attempts:${ip}:${normalizeEmail(email)}`
  const n = Number(await env.CACHE.get(key) ?? 0)
  if (n >= 10) throw new AuthError(429, 'Too many attempts. Try again in 15 minutes.')
  await env.CACHE.put(key, String(n + 1), { expirationTtl: 900 })
}

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string
    image: string | null
  }
}
