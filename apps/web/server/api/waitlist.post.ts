import { schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({
  email: z.email().max(320),
  source: z.string().max(100).optional(),
})

/** Landing-page waitlist (hosted edition). A light per-IP limit keeps bots out. */
export default defineEventHandler(async (event) => {
  requireCloud(event)
  const env = getEnv(event)
  // cf-connecting-ip is set by Cloudflare; X-Forwarded-For can be anything the client sends.
  const ip = getRequestHeader(event, 'cf-connecting-ip') ?? getRequestIP(event) ?? 'unknown'
  const key = `waitlist:ip:${ip}`
  const hits = Number(await env.CACHE.get(key) ?? 0)
  if (hits >= 5) throw createError({ statusCode: 429, statusMessage: 'Too many sign-ups from this network. Try again later.' })
  await env.CACHE.put(key, String(hits + 1), { expirationTtl: 3600 })

  const { email, source } = await readValidatedBody(event, Body.parse)
  await getDb(event).insert(schema.waitlist).values({ email: email.toLowerCase(), source }).onConflictDoNothing()
  return { ok: true }
})
