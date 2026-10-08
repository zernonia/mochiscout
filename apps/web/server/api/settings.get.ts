import { eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  const env = getEnv(event)
  const row = await getDb(event).select().from(schema.users).where(eq(schema.users.id, user.id)).get()
  return {
    email: row!.email,
    timezone: row!.timezone,
    digestHour: row!.digestHour,
    redditUsername: row!.redditUsername,
    redditKarma: row!.redditKarma,
    redditAccountCreatedAt: row!.redditAccountCreatedAt?.toISOString().slice(0, 10) ?? null,
    redditAccountStatus: row!.redditAccountStatus,
    redditCheckedAt: row!.redditCheckedAt,
    edition: useRuntimeConfig(event).public.edition,
    // Self-host: which keys are set (values never leave the server).
    keys: {
      anthropic: Boolean(env.ANTHROPIC_API_KEY),
      tinyfish: Boolean(env.TINYFISH_API_KEY),
      brave: Boolean(env.BRAVE_API_KEY),
      resend: Boolean(env.RESEND_API_KEY),
      github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
  }
})
