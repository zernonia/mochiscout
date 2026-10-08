import { describe, expect, it } from 'vitest'
import { createHttp, HttpDeferredError } from '../src/http'

function fakeClock() {
  let t = 1_000_000
  return {
    now: () => t,
    sleep: async (ms: number) => { t += ms },
    get time() { return t },
  }
}

function respond(status: number, headers: Record<string, string> = {}) {
  return new Response(status === 200 ? 'ok' : null, { status, headers })
}

describe('createHttp', () => {
  it('spaces requests by minDelayMs and sends the user agent', async () => {
    const clock = fakeClock()
    const calls: { at: number, ua: string | null }[] = []
    const http = createHttp({
      userAgent: 'test-agent',
      minDelayMs: 1000,
      ...clock,
      fetch: async (_url, init) => {
        calls.push({ at: clock.time, ua: new Headers(init?.headers).get('user-agent') })
        return respond(200)
      },
    })
    await Promise.all([http.getText('https://a'), http.getText('https://b')])
    expect(calls.map(c => c.ua)).toEqual(['test-agent', 'test-agent'])
    expect(calls[1]!.at - calls[0]!.at).toBe(1000)
  })

  it('waits for x-ratelimit-reset when the budget is spent', async () => {
    const clock = fakeClock()
    const calls: number[] = []
    const http = createHttp({
      userAgent: 't',
      ...clock,
      fetch: async () => {
        calls.push(clock.time)
        return respond(200, { 'x-ratelimit-remaining': '0.0', 'x-ratelimit-reset': '20' })
      },
    })
    await http.getText('https://a')
    await http.getText('https://b')
    expect(calls[1]! - calls[0]!).toBe(20_500)
  })

  it('retries 429 after Retry-After', async () => {
    const clock = fakeClock()
    const statuses = [429, 200]
    const http = createHttp({
      userAgent: 't',
      ...clock,
      fetch: async () => respond(statuses.shift()!, { 'retry-after': '3' }),
    })
    const start = clock.time
    await expect(http.getText('https://a')).resolves.toMatchObject({ status: 'ok' })
    expect(clock.time - start).toBe(3000)
  })

  it('defers instead of waiting past the deadline', async () => {
    const clock = fakeClock()
    const http = createHttp({
      userAgent: 't',
      ...clock,
      deadline: clock.time + 10_000,
      fetch: async () => respond(200, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '30' }),
    })
    await http.getText('https://a')
    await expect(http.getText('https://b')).rejects.toBeInstanceOf(HttpDeferredError)
  })

  it('a failed request does not block the next one', async () => {
    const clock = fakeClock()
    const statuses = [500, 200]
    const http = createHttp({ userAgent: 't', ...clock, fetch: async () => respond(statuses.shift()!) })
    await expect(http.getText('https://a')).rejects.toThrow('500')
    await expect(http.getText('https://b')).resolves.toMatchObject({ status: 'ok' })
  })
})
