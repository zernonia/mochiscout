import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { and, desc, eq, schema } from '@mochiscout/db'

const PREFIX = 'sr_'

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function hashApiKey(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateApiKey() {
  return `${PREFIX}${base64url(crypto.getRandomValues(new Uint8Array(32)))}`
}

/** Resolve `Authorization: Bearer sr_…` to the key's user and org. */
export async function authenticateApiKey(event: RequestEvent) {
  const header = getRequestHeader(event, 'authorization') ?? ''
  const key = header.match(/^Bearer\s+(\S+)$/i)?.[1]
  const fail = () => {
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="mochiscout"')
    return createError({ statusCode: 401, statusMessage: 'Missing or invalid API key. Create one in Settings → API keys.' })
  }
  if (!key?.startsWith(PREFIX)) throw fail()

  const db = getDb(event)
  const row = await db
    .select({ key: schema.apiKeys, org: schema.orgs, user: schema.users })
    .from(schema.apiKeys)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.apiKeys.orgId))
    .innerJoin(schema.users, eq(schema.users.id, schema.apiKeys.userId))
    .where(eq(schema.apiKeys.hash, await hashApiKey(key)))
    .get()
  if (!row) throw fail()

  // The key's user must still belong to the org.
  const member = await db.select({ role: schema.orgMembers.role }).from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, row.org.id), eq(schema.orgMembers.userId, row.user.id))).get()
  if (!member) throw fail()

  event.waitUntil(db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, row.key.id)).then(() => {}))
  return { user: row.user, org: row.org, role: member.role }
}

export async function listApiKeys(event: RequestEvent, orgId: string, userId: string) {
  return getDb(event)
    .select({ id: schema.apiKeys.id, label: schema.apiKeys.label, prefix: schema.apiKeys.prefix, createdAt: schema.apiKeys.createdAt, lastUsedAt: schema.apiKeys.lastUsedAt })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.orgId, orgId), eq(schema.apiKeys.userId, userId)))
    .orderBy(desc(schema.apiKeys.createdAt))
}
