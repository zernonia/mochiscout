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

/**
 * Who to count for per-IP limits. cf-connecting-ip is set by Cloudflare
 * (X-Forwarded-For can be anything the client sends). An IPv6 user usually
 * holds a whole /64, so that is the unit counted.
 */
export function clientKey(event: H3Event) {
  return networkOf(getRequestHeader(event, 'cf-connecting-ip') ?? getRequestIP(event) ?? 'unknown')
}

export function networkOf(ip: string) {
  // IPv4, including IPv4-mapped IPv6 (::ffff:1.2.3.4).
  if (!ip.includes(':') || ip.includes('.')) return ip.slice(ip.lastIndexOf(':') + 1)
  const [head = '', tail] = ip.toLowerCase().split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return `${groups.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '')).join(':')}::/64`
}
