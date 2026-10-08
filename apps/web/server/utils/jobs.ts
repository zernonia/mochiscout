import type { JobContext } from '@social-radar/core'
import type { Env } from './env'
import { createDb } from '@social-radar/db'
import type { SearchProvider } from '@social-radar/sources'
import { brave, createHttp, createSearchClient, tinyfish, userAgent } from '@social-radar/sources'

/** Leave headroom under the Workers cron wall-clock limit (15 min). */
const RUN_BUDGET_MS = 10 * 60_000

/** Bindings inside a Nitro task or queue handler (no request event there). */
export function getTaskEnv(context?: { cloudflare?: { env?: unknown } }): Env {
  const env = (context?.cloudflare?.env ?? (globalThis as { __env__?: unknown }).__env__) as Env | undefined
  if (!env?.DB) throw new Error('Cloudflare bindings unavailable')
  return env
}

export function sourcesUserAgent(env: Env) {
  return userAgent(env.CONTACT_URL ?? 'https://github.com/zernonia/social-radar')
}

export function createJobContext(env: Env, opts: { budgetMs?: number } = {}): JobContext {
  const ua = sourcesUserAgent(env)
  const deadline = Date.now() + (opts.budgetMs ?? RUN_BUDGET_MS)
  return {
    db: createDb(env.DB),
    cache: env.CACHE,
    queue: env.JOBS,
    http: createHttp({ userAgent: ua, kv: env.CACHE, deadline }),
    search: createSearch(env, ua, deadline),
    llm: getLlm(env) ?? undefined,
    // Without a Resend key, emails are only logged, which is useful in dev only.
    sendEmail: env.RESEND_API_KEY || import.meta.dev ? email => sendEmail(env, email) : undefined,
    appUrl: env.APP_URL ?? env.BETTER_AUTH_URL ?? (import.meta.dev ? 'http://localhost:3000' : undefined),
    now: () => new Date(),
    log: (message, data) => console.info(`[jobs] ${message}`, data ? JSON.stringify(data) : ''),
  }
}

/** Primary provider from SEARCH_PROVIDER (default TinyFish); the other is the fallback if its key is set. */
function createSearch(env: Env, ua: string, deadline: number) {
  // TinyFish allows 30 req/min per key.
  const http = createHttp({ userAgent: ua, minDelayMs: 2100, deadline })
  const available: SearchProvider[] = []
  if (env.TINYFISH_API_KEY) available.push(tinyfish(http, env.TINYFISH_API_KEY))
  if (env.BRAVE_API_KEY) available.push(brave(http, env.BRAVE_API_KEY))
  if (env.SEARCH_PROVIDER === 'brave') available.reverse()
  return available.length ? createSearchClient({ providers: available, cache: env.CACHE }) : undefined
}
