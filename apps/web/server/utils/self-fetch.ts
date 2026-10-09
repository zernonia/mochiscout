import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { Env } from './env'

/**
 * A fetch that serves this app's own URLs internally. A Worker can't fetch its own custom
 * domain over the network (Cloudflare answers 522), e.g. when a user onboards mochiscout.com.
 */
export function selfAwareFetch(event: RequestEvent, env: Env): typeof fetch {
  const own = new Set<string>([getRequestHost(event)])
  if (env.APP_URL) own.add(new URL(env.APP_URL).host)
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString())
    if (own.has(url.host)) return event.fetch(url.pathname + url.search, init)
    return fetch(input, init)
  }) as typeof fetch
}
