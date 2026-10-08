import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { count, eq, schema } from '@social-radar/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { magicLink } from 'better-auth/plugins/magic-link'

function createAuth(event: RequestEvent) {
  const env = getEnv(event)
  const db = getDb(event)
  const edition = useRuntimeConfig(event).public.edition
  const baseURL = env.BETTER_AUTH_URL ?? getRequestURL(event).origin

  if (!env.BETTER_AUTH_SECRET && !import.meta.dev) {
    throw createError({ statusCode: 500, statusMessage: 'BETTER_AUTH_SECRET is not set' })
  }

  // Self-host is single-user: only the first sign-up (or ALLOWED_EMAILS) gets in.
  async function assertCanSignUp(email: string) {
    if (edition !== 'selfhost') return
    const allowed = (env.ALLOWED_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
    if (allowed.includes(email.toLowerCase())) return
    const [row] = await db.select({ n: count() }).from(schema.users)
    if ((row?.n ?? 0) > 0) {
      throw new APIError('FORBIDDEN', { message: 'Sign-ups are closed on this instance.' })
    }
  }

  return betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET ?? 'dev-only-secret-do-not-use-in-production',
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    user: {
      modelName: 'users',
      additionalFields: {
        timezone: { type: 'string', required: false, defaultValue: 'UTC' },
        digestHour: { type: 'number', required: false, defaultValue: 8 },
        redditUsername: { type: 'string', required: false },
      },
    },
    session: { modelName: 'sessions' },
    account: { modelName: 'accounts' },
    verification: { modelName: 'verifications' },
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
    },
    plugins: [
      magicLink({
        async sendMagicLink({ email, url }) {
          // Fail before emailing a link that would be rejected on click.
          const existing = await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, email.toLowerCase()))
            .get()
          if (!existing) await assertCanSignUp(email)
          await sendEmail(env, {
            to: email,
            subject: 'Your social-radar sign-in link',
            text: `Sign in to social-radar:\n\n${url}\n\nThis link expires in 5 minutes. If you didn't ask for it, ignore this email.`,
            html: `<p>Sign in to social-radar:</p><p><a href="${url}">Sign in</a></p><p style="color:#666">This link expires in 5 minutes. If you didn't ask for it, ignore this email.</p>`,
          })
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            await assertCanSignUp(user.email)
          },
          async after(user) {
            await db.insert(schema.orgs).values({
              id: crypto.randomUUID(),
              ownerId: user.id,
              plan: edition === 'selfhost' ? 'selfhost' : 'free',
            })
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

const instances = new WeakMap<RequestEvent, Auth>()

/** Better Auth instance for this request (D1 is a per-request binding). */
export function useAuth(event: RequestEvent): Auth {
  let auth = instances.get(event)
  if (!auth) {
    auth = createAuth(event)
    instances.set(event, auth)
  }
  return auth
}
