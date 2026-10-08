import type { JobContext } from '@social-radar/core'
import type { Env } from './env'
import { createDb } from '@social-radar/db'
import { createHttp, userAgent } from '@social-radar/sources'

/** Leave headroom under the Workers cron wall-clock limit (15 min). */
const RUN_BUDGET_MS = 10 * 60_000

/** Bindings inside a Nitro task or queue handler (no request event there). */
export function getTaskEnv(context?: { cloudflare?: { env?: unknown } }): Env {
  const env = (context?.cloudflare?.env ?? (globalThis as { __env__?: unknown }).__env__) as Env | undefined
  if (!env?.DB) throw new Error('Cloudflare bindings unavailable')
  return env
}

export function createJobContext(env: Env, opts: { budgetMs?: number } = {}): JobContext {
  return {
    db: createDb(env.DB),
    cache: env.CACHE,
    queue: env.JOBS,
    http: createHttp({
      userAgent: userAgent(env.CONTACT_URL ?? 'https://github.com/zernonia/social-radar'),
      kv: env.CACHE,
      deadline: Date.now() + (opts.budgetMs ?? RUN_BUDGET_MS),
    }),
    now: () => new Date(),
    log: (message, data) => console.info(`[jobs] ${message}`, data ? JSON.stringify(data) : ''),
  }
}
