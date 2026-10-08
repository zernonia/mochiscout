import type { KVNamespace } from '@cloudflare/workers-types'
import type { SearchProvider } from '../src/search/types'
import { describe, expect, it } from 'vitest'
import { createHttp } from '../src/http'
import { cleanRedditTitle, parseRedditThreadUrl } from '../src/reddit/url'
import { brave } from '../src/search/brave'
import { createSearchClient } from '../src/search/client'
import { tinyfish } from '../src/search/tinyfish'

const instant = { sleep: async () => {}, minDelayMs: 0 }

function recordingHttp(body: unknown) {
  const requests: { url: URL, headers: Headers }[] = []
  const http = createHttp({
    userAgent: 't',
    ...instant,
    fetch: async (url, init) => {
      requests.push({ url: new URL(String(url)), headers: new Headers(init?.headers) })
      return new Response(JSON.stringify(body), { status: 200 })
    },
  })
  return { http, requests }
}

function memoryKv() {
  const store = new Map<string, string>()
  return {
    store,
    kv: {
      get: async (key: string, type?: string) => {
        const v = store.get(key)
        return v === undefined ? null : type === 'json' ? JSON.parse(v) : v
      },
      put: async (key: string, value: string) => { store.set(key, value) },
    } as unknown as KVNamespace,
  }
}

describe('tinyfish', () => {
  it('sends the key, domain and recency filters and maps results', async () => {
    const { http, requests } = recordingHttp({
      results: [{ position: 1, title: 'T', snippet: 'S', url: 'https://www.reddit.com/r/a/comments/x1/t/' }],
    })
    const results = await tinyfish(http, 'KEY').search({
      query: 'best crm tool',
      domains: ['reddit.com'],
      recencyMinutes: 10080,
      purpose: 'p',
    })
    expect(results).toEqual([{ title: 'T', snippet: 'S', url: 'https://www.reddit.com/r/a/comments/x1/t/', position: 1 }])
    const req = requests[0]!
    expect(req.url.origin).toBe('https://api.search.tinyfish.ai')
    expect(Object.fromEntries(req.url.searchParams)).toEqual({
      query: 'best crm tool',
      include_domains: 'reddit.com',
      recency_minutes: '10080',
      purpose: 'p',
    })
    expect(req.headers.get('x-api-key')).toBe('KEY')
  })
})

describe('brave', () => {
  it('restricts by site: and maps recency to freshness', async () => {
    const { http, requests } = recordingHttp({
      web: { results: [{ title: '<strong>T</strong>', url: 'https://u', description: 'a &amp; b' }] },
    })
    const results = await brave(http, 'KEY').search({ query: 'q', domains: ['reddit.com'], recencyMinutes: 10080 })
    expect(results).toEqual([{ title: 'T', url: 'https://u', snippet: 'a & b', position: 1 }])
    expect(requests[0]!.url.searchParams.get('q')).toBe('q (site:reddit.com)')
    expect(requests[0]!.url.searchParams.get('freshness')).toBe('pw')
    expect(requests[0]!.headers.get('x-subscription-token')).toBe('KEY')
  })
})

describe('createSearchClient', () => {
  const ok = (id: 'tinyfish' | 'brave'): SearchProvider => ({
    id,
    search: async () => [{ title: id, url: 'u', snippet: '', position: 1 }],
  })
  const failing: SearchProvider = { id: 'tinyfish', search: async () => { throw new Error('429') } }

  it('falls back to the next provider on error', async () => {
    const client = createSearchClient({ providers: [failing, ok('brave')] })
    await expect(client.search({ query: 'q' })).resolves.toMatchObject({ provider: 'brave' })
  })

  it('caches by normalized query', async () => {
    let calls = 0
    const counting: SearchProvider = { id: 'tinyfish', search: async () => { calls++; return [] } }
    const { kv } = memoryKv()
    const client = createSearchClient({ providers: [counting], cache: kv })
    await client.search({ query: 'Best  CRM', domains: ['reddit.com'] })
    const second = await client.search({ query: 'best crm', domains: ['reddit.com'] })
    expect(calls).toBe(1)
    expect(second.cached).toBe(true)
  })

  it('throws when every provider fails', async () => {
    const client = createSearchClient({ providers: [failing] })
    await expect(client.search({ query: 'q' })).rejects.toThrow('429')
  })
})

describe('parseRedditThreadUrl', () => {
  it('canonicalizes thread URLs from any reddit host', () => {
    expect(parseRedditThreadUrl('https://old.reddit.com/r/SaaS/comments/1AbC2d/some_title/?utm=x')).toEqual({
      id: 'reddit:t3_1abc2d',
      subreddit: 'saas',
      url: 'https://www.reddit.com/r/saas/comments/1abc2d/',
    })
  })
  it('ignores non-thread and non-reddit URLs', () => {
    expect(parseRedditThreadUrl('https://www.reddit.com/r/SaaS/')).toBeNull()
    expect(parseRedditThreadUrl('https://notreddit.com/r/a/comments/x/')).toBeNull()
  })
})

describe('cleanRedditTitle', () => {
  it('strips search-engine suffixes', () => {
    expect(cleanRedditTitle('Best CRM for a tiny team? : r/smallbusiness')).toBe('Best CRM for a tiny team?')
    expect(cleanRedditTitle('Best CRM for a tiny team? - Reddit')).toBe('Best CRM for a tiny team?')
  })
})
