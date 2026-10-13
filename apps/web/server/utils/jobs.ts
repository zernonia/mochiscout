import type { JobContext } from '@mochiscout/core'
import type { Env } from './env'
import { createDb } from '@mochiscout/db'
import type { SearchProvider } from '@mochiscout/sources'
import { blueskyAdapter, brave, createHttp, createSearchClient, hnAdapter, tinyfish, tinyfishFetcher, userAgent, xAdapter } from '@mochiscout/sources'

/** Expected, frequent misses that aren't worth an error report. */
const QUIET_FAILURES = new Set(['thread context failed', 'tracker check failed', 'account check failed'])

/** Leave headroom under the Workers cron wall-clock limit (15 min). */
const RUN_BUDGET_MS = 10 * 60_000

/** Bindings inside a Nitro task or queue handler (no request event there). */
export function getTaskEnv(context?: { cloudflare?: { env?: unknown } }): Env {
  const env = (context?.cloudflare?.env ?? (globalThis as { __env__?: unknown }).__env__) as Env | undefined
  if (!env?.DB) throw new Error('Cloudflare bindings unavailable')
  return env
}

export function sourcesUserAgent(env: Env) {
  // Identify this instance to reddit.com: its own contact URL, else its public URL, else the project repo.
  return userAgent(env.CONTACT_URL ?? env.APP_URL ?? 'https://github.com/zernonia/mochiscout')
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
    pages: env.TINYFISH_API_KEY ? tinyfishFetcher(env.TINYFISH_API_KEY) : undefined,
    adapters: createAdapters(env, ua, deadline),
    readMode: env.READ_MODE ?? 'server',
    llm: getLlm(env) ?? undefined,
    // Without a provider, emails are only logged, which is useful in dev only.
    sendEmail: emailProvider(env) || import.meta.dev ? email => sendEmail(env, email) : undefined,
    appUrl: env.APP_URL ?? (import.meta.dev ? 'http://localhost:3000' : undefined),
    track: (userId, name, properties = {}) => captureServerEvent(env.NUXT_PUBLIC_POSTHOG_KEY ?? useRuntimeConfig().public.posthogKey, userId, name, properties),
    now: () => new Date(),
    log: (message, data) => {
      console.info(`[jobs] ${message}`, data ? JSON.stringify(data) : '')
      // Job failures also go to PostHog error tracking (per-thread fetch misses are routine and stay out).
      if (data?.error && /failed$/.test(message) && !QUIET_FAILURES.has(message)) {
        void reportServerError(env.NUXT_PUBLIC_POSTHOG_KEY ?? useRuntimeConfig().public.posthogKey, new Error(`${message}: ${String(data.error)}`), { source: 'cron', job_message: message, ...data, error: undefined })
      }
    },
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

/** Feed sources besides Reddit. HN and Bluesky are keyless; X needs a paid API key. */
function createAdapters(env: Env, ua: string, deadline: number) {
  const http = createHttp({ userAgent: ua, minDelayMs: 1000, deadline })
  return {
    hn: hnAdapter(http),
    bluesky: blueskyAdapter(http),
    ...(env.X_BEARER_TOKEN ? { x: xAdapter(http, env.X_BEARER_TOKEN) } : {}),
  }
}
