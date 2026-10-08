import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { desc, eq, schema } from '@social-radar/db'

export async function getUserSession(event: RequestEvent) {
  return useAuth(event).api.getSession({ headers: event.headers })
}

/**
 * Throws 401 unless signed in. Returns the user, their active org (the org
 * they joined most recently) and their role in it.
 */
export async function requireUser(event: RequestEvent) {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const membership = await getDb(event)
    .select({ org: schema.orgs, role: schema.orgMembers.role })
    .from(schema.orgMembers)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.orgMembers.orgId))
    .where(eq(schema.orgMembers.userId, session.user.id))
    .orderBy(desc(schema.orgMembers.createdAt))
    .get()
  if (!membership) {
    throw createError({ statusCode: 500, statusMessage: 'User has no org' })
  }
  return { user: session.user, org: membership.org, role: membership.role }
}

/** Owner-only actions (billing, seats). */
export async function requireOwner(event: RequestEvent) {
  const ctx = await requireUser(event)
  if (ctx.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Only the owner can do this.' })
  return ctx
}
