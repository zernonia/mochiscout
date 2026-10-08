import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { eq, schema } from '@social-radar/db'

export async function getUserSession(event: RequestEvent) {
  return useAuth(event).api.getSession({ headers: event.headers })
}

/** Throws 401 unless signed in. Returns the user and their org. */
export async function requireUser(event: RequestEvent) {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const org = await getDb(event)
    .select()
    .from(schema.orgs)
    .where(eq(schema.orgs.ownerId, session.user.id))
    .get()
  if (!org) {
    throw createError({ statusCode: 500, statusMessage: 'User has no org' })
  }
  return { user: session.user, org }
}
