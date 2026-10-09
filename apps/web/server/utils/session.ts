import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { desc, eq, schema } from '@mochiscout/db'

export const ACTIVE_ORG_COOKIE = 'sr_org'

/**
 * Throws 401 unless signed in. Returns the user (fresh from the database),
 * their active org and their role in it.
 */
export async function requireUser(event: RequestEvent) {
  const session = await getUserSession(event)
  const userId = session.user?.id
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb(event)
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get()
  if (!user) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Active org: the one picked in the switcher (cookie) if still a member,
  // otherwise the org joined most recently.
  const memberships = await db
    .select({ org: schema.orgs, role: schema.orgMembers.role })
    .from(schema.orgMembers)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.orgMembers.orgId))
    .where(eq(schema.orgMembers.userId, user.id))
    .orderBy(desc(schema.orgMembers.createdAt))
  const picked = getCookie(event, ACTIVE_ORG_COOKIE)
  const membership = memberships.find(m => m.org.id === picked) ?? memberships[0]
  if (!membership) throw createError({ statusCode: 500, statusMessage: 'User has no org' })
  return { user, org: membership.org, role: membership.role, orgCount: memberships.length }
}

/** Owner-only actions (billing, seats). */
export async function requireOwner(event: RequestEvent) {
  const ctx = await requireUser(event)
  if (ctx.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Only the owner can do this.' })
  return ctx
}
