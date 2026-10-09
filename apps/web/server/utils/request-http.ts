import type { H3Event } from 'h3'
import { createHttp } from '@mochiscout/sources'

/**
 * HTTP client for reads made while a user waits (e.g. fetching a thread
 * before drafting). Never waits long on a rate limit: callers fall back to
 * what is stored.
 */
export function requestHttp(event: H3Event) {
  const env = getEnv(event)
  return createHttp({ userAgent: sourcesUserAgent(env), kv: env.CACHE, maxWaitMs: 3000, deadline: Date.now() + 15_000 })
}
