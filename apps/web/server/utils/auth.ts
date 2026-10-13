import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { TRIAL_DAYS, TRIAL_PLAN, trialStart } from '@mochiscout/core'
import { and, count, eq, inArray, ne, schema } from '@mochiscout/db'

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

/**
 * Self-host: new users join the single instance org. Hosted: every new user
 * gets their own org on the Pro trial, and joins a team only by accepting
 * its invite (so nobody can pull a new user's work into their org by
 * inviting the address first). Returns whether a trial started.
 */
async function setUpMembership(event: RequestEvent, db: Db, user: { id: string, email: string, emailVerified: boolean }): Promise<boolean> {
  const { edition } = editionOf(event)
  const invite = edition === 'selfhost' && user.emailVerified
    ? await db.select().from(schema.orgInvites).where(eq(schema.orgInvites.email, user.email)).get()
    : undefined
  const existingOrg = edition === 'selfhost' ? await db.select({ id: schema.orgs.id }).from(schema.orgs).get() : undefined
  const joinOrgId = invite?.orgId ?? existingOrg?.id

  if (joinOrgId) {
    await db.batch([
      db.insert(schema.orgMembers).values({ orgId: joinOrgId, userId: user.id, role: 'member' }).onConflictDoNothing(),
      db.delete(schema.orgInvites).where(eq(schema.orgInvites.email, user.email)),
    ])
    return false
  }
  const orgId = crypto.randomUUID()
  const plan = edition === 'selfhost' ? { plan: 'selfhost' as const } : trialStart(new Date())
  await db.batch([
    db.insert(schema.orgs).values({ id: orgId, ownerId: user.id, ...plan }),
    db.insert(schema.orgMembers).values({ orgId, userId: user.id, role: 'owner' }),
  ])
  return edition !== 'selfhost'
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
  const trial = await setUpMembership(event, db, user!)
  track(event as Parameters<typeof track>[0], user!.id, 'signed_up', { method: input.emailVerified ? 'oauth' : 'password' })
  if (trial) track(event as Parameters<typeof track>[0], user!.id, 'trial_started', { plan: TRIAL_PLAN, days: TRIAL_DAYS })
  return user!
}

export async function startSession(event: RequestEvent, user: User) {
  await replaceUserSession(event, {
    user: { id: user.id, email: user.email, name: user.name, image: user.image, createdAt: user.createdAt.getTime() },
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
  // Same message and roughly the same time for an unknown email and a wrong password.
  if (!row?.password) {
    await hashPassword(input.password)
    throw new AuthError(401, 'Wrong email or password.')
  }
  if (!(await verifyPassword(row.password, input.password))) {
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
    // An unverified account is being claimed by the email's real owner: whoever
    // registered it first loses the password, every signed-in session and every API key,
    // and anyone they let into the account's orgs (members, invites, alert webhooks) is cut off.
    const claim = !user.emailVerified
    const ownedOrgIds = claim
      ? (await db.select({ id: schema.orgs.id }).from(schema.orgs).where(eq(schema.orgs.ownerId, user.id))).map(o => o.id)
      : []
    const statements = [
      db.update(schema.users).set({ emailVerified: true, image: user.image ?? profile.image ?? null, updatedAt: new Date() }).where(eq(schema.users.id, user.id)),
      ...(claim
        ? [
            db.delete(schema.accounts).where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'credential'))),
            db.delete(schema.apiKeys).where(eq(schema.apiKeys.userId, user.id)),
          ]
        : []),
      ...(ownedOrgIds.length
        ? [
            db.delete(schema.orgMembers).where(and(inArray(schema.orgMembers.orgId, ownedOrgIds), ne(schema.orgMembers.userId, user.id))),
            db.delete(schema.orgInvites).where(inArray(schema.orgInvites.orgId, ownedOrgIds)),
            db.update(schema.projects).set({ alertWebhookUrl: null }).where(inArray(schema.projects.orgId, ownedOrgIds)),
          ]
        : []),
    ]
    await db.batch(statements as [typeof statements[number], ...typeof statements])
    if (claim) await revokeSessions(event, user.id)
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

/**
 * Login and sign-up attempts, to slow down password guessing: per IP + email,
 * and per email from anywhere (a distributed guess at one account).
 */
export async function rateLimitAuth(event: RequestEvent, email: string) {
  const env = getEnv(event)
  const ip = clientKey(event)
  const address = normalizeEmail(email)
  const limits = [
    { key: `auth:attempts:${ip}:${address}`, max: 10 },
    { key: `auth:attempts:any:${address}`, max: 50 },
  ]
  const counts = await Promise.all(limits.map(l => env.CACHE.get(l.key).then(v => Number(v ?? 0))))
  if (limits.some((l, i) => counts[i]! >= l.max)) throw new AuthError(429, 'Too many attempts. Try again in 15 minutes.')
  await Promise.all(limits.map((l, i) => env.CACHE.put(l.key, String(counts[i]! + 1), { expirationTtl: 900 })))
}

/** New accounts per IP per day (each hosted account starts a Pro trial). */
export async function rateLimitSignup(event: RequestEvent) {
  const env = getEnv(event)
  const ip = clientKey(event)
  const key = `auth:signups:${ip}:${new Date().toISOString().slice(0, 10)}`
  const n = Number(await env.CACHE.get(key) ?? 0)
  if (n >= 10) throw new AuthError(429, 'Too many new accounts from this network today. Try again tomorrow.')
  await env.CACHE.put(key, String(n + 1), { expirationTtl: 90_000 })
}

/** Signs out every session of a user started before now (checked in requireUser). */
export async function revokeSessions(event: RequestEvent, userId: string) {
  await getEnv(event).CACHE.put(`auth:revoked:${userId}`, String(Date.now()), { expirationTtl: 31 * 86_400 })
}

/** Whether a session started at `loggedInAt` (ms) was revoked since. */
export async function sessionRevoked(event: RequestEvent, userId: string, loggedInAt: number | undefined) {
  const revokedAt = Number(await getEnv(event).CACHE.get(`auth:revoked:${userId}`) ?? 0)
  return revokedAt > 0 && (loggedInAt ?? 0) <= revokedAt
}

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string
    image: string | null
    /** Account creation (ms); absent on sessions started before it was added. */
    createdAt?: number
  }
}
