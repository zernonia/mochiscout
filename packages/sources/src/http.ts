import type { KVNamespace } from '@cloudflare/workers-types'

/**
 * The only path to reddit.com and other sources (see docs/arch.md §5, §14).
 *
 * - Requests are serialized per client with a minimum gap between them.
 * - Honours 429 / Retry-After and Reddit's x-ratelimit-* headers.
 * - Optional conditional requests (ETag / Last-Modified stored in KV).
 * - Never sleeps past `deadline` or longer than `maxWaitMs`: it throws
 *   HttpDeferredError instead so the caller can resume on the next cron tick.
 */
export interface HttpOptions {
  userAgent: string
  /** Minimum gap between two requests from this client. Default 1000 ms. */
  minDelayMs?: number
  /** Retries after 429/503. Default 2. */
  maxRetries?: number
  /** Longest single wait accepted before deferring. Default 65 s. */
  maxWaitMs?: number
  /** Epoch ms after which no wait may end (keeps cron runs inside the Worker time limit). */
  deadline?: number
  /** Stores conditional-request validators. */
  kv?: KVNamespace
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

export type HttpResult =
  | { status: 'ok', body: string, headers: Headers }
  | { status: 'not_modified' }

export class HttpError extends Error {
  constructor(readonly url: string, readonly status: number) {
    super(`GET ${url} failed with ${status}`)
    this.name = 'HttpError'
  }
}

/** Rate limited or out of time: try again at `retryAt` (epoch ms). */
export class HttpDeferredError extends Error {
  constructor(readonly url: string, readonly retryAt: number) {
    super(`GET ${url} deferred until ${new Date(retryAt).toISOString()}`)
    this.name = 'HttpDeferredError'
  }
}

interface Validators {
  etag?: string
  lastModified?: string
}

const VALIDATOR_TTL_S = 7 * 24 * 3600

export function createHttp(options: HttpOptions) {
  const {
    userAgent,
    minDelayMs = 1000,
    maxRetries = 2,
    maxWaitMs = 65_000,
    deadline,
    kv,
    fetch: doFetch = fetch,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    now = Date.now,
  } = options

  let queue: Promise<unknown> = Promise.resolve()
  let nextAllowedAt = 0

  async function waitTurn(url: string) {
    const at = nextAllowedAt
    const ms = at - now()
    if (ms <= 0) return
    if (ms > maxWaitMs || (deadline !== undefined && at > deadline)) {
      throw new HttpDeferredError(url, at)
    }
    await sleep(ms)
  }

  function noteRateLimit(res: Response, attempt: number) {
    const started = now()
    nextAllowedAt = Math.max(nextAllowedAt, started + minDelayMs)

    const remaining = Number.parseFloat(res.headers.get('x-ratelimit-remaining') ?? '')
    const reset = Number.parseFloat(res.headers.get('x-ratelimit-reset') ?? '')
    if (Number.isFinite(remaining) && remaining < 1 && Number.isFinite(reset)) {
      nextAllowedAt = Math.max(nextAllowedAt, started + reset * 1000 + 500)
    }

    if (res.status === 429 || res.status === 503) {
      const retryAfter = parseRetryAfter(res.headers.get('retry-after'), started)
      const backoff = 5000 * 2 ** attempt
      nextAllowedAt = Math.max(nextAllowedAt, retryAfter ?? started + backoff)
    }
  }

  async function get(url: string, conditional: boolean, extraHeaders: Record<string, string>): Promise<HttpResult> {
    const key = `http:validators:${url}`
    const validators = conditional && kv ? await kv.get<Validators>(key, 'json') : null

    for (let attempt = 0; ; attempt++) {
      await waitTurn(url)

      const headers: Record<string, string> = { 'User-Agent': userAgent, 'Accept': '*/*', ...extraHeaders }
      if (validators?.etag) headers['If-None-Match'] = validators.etag
      if (validators?.lastModified) headers['If-Modified-Since'] = validators.lastModified

      const res = await doFetch(url, { headers, redirect: 'follow' })
      noteRateLimit(res, attempt)

      if (res.status === 304) return { status: 'not_modified' }

      if (res.status === 429 || res.status === 503) {
        await res.body?.cancel()
        if (attempt >= maxRetries) throw new HttpDeferredError(url, nextAllowedAt)
        continue
      }

      if (!res.ok) {
        await res.body?.cancel()
        throw new HttpError(url, res.status)
      }

      const body = await res.text()
      if (conditional && kv) {
        const next: Validators = {
          etag: res.headers.get('etag') ?? undefined,
          lastModified: res.headers.get('last-modified') ?? undefined,
        }
        if (next.etag || next.lastModified) {
          await kv.put(key, JSON.stringify(next), { expirationTtl: VALIDATOR_TTL_S })
        }
      }
      return { status: 'ok', body, headers: res.headers }
    }
  }

  return {
    /** Serialized GET. Pass `conditional` to send stored ETag / Last-Modified. */
    getText(url: string, opts: { conditional?: boolean, headers?: Record<string, string> } = {}): Promise<HttpResult> {
      const run = queue.then(() => get(url, opts.conditional ?? false, opts.headers ?? {}))
      queue = run.catch(() => {})
      return run
    },
  }
}

export type Http = ReturnType<typeof createHttp>

function parseRetryAfter(value: string | null, from: number): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return from + seconds * 1000
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : date
}

export function userAgent(contactUrl: string) {
  return `mochiscout/0.1 (+${contactUrl})`
}
