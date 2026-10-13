import type { H3Event } from 'h3'

/**
 * Fixed-window counter in KV for endpoints that spend money (LLM calls,
 * searches, page fetches). `key` names who is limited (a user, org or
 * project); throws 429 once `max` calls happened in the window.
 */
export async function rateLimit(event: H3Event, key: string, opts: { max: number, windowSeconds: number, message?: string }) {
  const env = getEnv(event)
  const window = Math.floor(Date.now() / 1000 / opts.windowSeconds)
  const k = `rl:${key}:${window}`
  const used = Number(await env.CACHE.get(k) ?? 0)
  if (used >= opts.max) {
    throw createError({ statusCode: 429, statusMessage: opts.message ?? 'Too many requests. Try again in a little while.' })
  }
  await env.CACHE.put(k, String(used + 1), { expirationTtl: Math.max(60, opts.windowSeconds + 60) })
}
