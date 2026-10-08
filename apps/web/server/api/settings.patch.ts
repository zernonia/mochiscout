import { checkRedditAccount } from '@social-radar/core'
import { eq, schema } from '@social-radar/db'
import { normalizeRedditUsername } from '@social-radar/sources'
import { z } from 'zod'

const Body = z.object({
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz })
      return true
    }
    catch {
      return false
    }
  }, 'Unknown time zone'),
  /** -1 turns the digest off. */
  digestHour: z.number().int().min(-1).max(23),
  redditUsername: z.string().trim().max(40).nullable(),
  redditKarma: z.number().int().min(-100_000).max(100_000_000).nullable(),
  redditAccountCreatedAt: z.iso.date().nullable(),
}).partial()

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  const body = await readValidatedBody(event, Body.parse)

  const update: Partial<typeof schema.users.$inferInsert> = {}
  if (body.timezone !== undefined) update.timezone = body.timezone
  if (body.digestHour !== undefined) update.digestHour = body.digestHour
  if (body.redditKarma !== undefined) update.redditKarma = body.redditKarma
  if (body.redditAccountCreatedAt !== undefined) {
    update.redditAccountCreatedAt = body.redditAccountCreatedAt ? new Date(`${body.redditAccountCreatedAt}T00:00:00Z`) : null
  }
  if (body.redditUsername !== undefined) {
    const name = body.redditUsername ? normalizeRedditUsername(body.redditUsername) : null
    if (body.redditUsername && !name) throw createError({ statusCode: 400, statusMessage: 'Not a valid Reddit username' })
    update.redditUsername = name
    // A new username needs a fresh account check.
    update.redditAccountStatus = null
    update.redditCheckedAt = null
  }
  if (Object.keys(update).length) {
    await getDb(event).update(schema.users).set({ ...update, updatedAt: new Date() }).where(eq(schema.users.id, user.id))
  }
  if (update.redditUsername) {
    const ctx = createJobContext(getEnv(event), { budgetMs: 90_000 })
    event.waitUntil(checkRedditAccount(ctx, user.id, update.redditUsername).catch(error => ctx.log('account check failed', { error: String(error) })))
  }
  return { ok: true }
})
