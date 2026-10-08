import type { KVNamespace } from '@cloudflare/workers-types'
import type { SearchProvider, SearchProviderId, SearchQuery, SearchResult } from './types'

const CACHE_TTL_S = 6 * 3600

export interface SearchResponse {
  provider: SearchProviderId
  cached: boolean
  results: SearchResult[]
}

/**
 * Primary provider with automatic fallback (TinyFish → Brave on error or 429),
 * and a KV cache keyed by the normalized query so identical searches from
 * different projects are made once per 6 h.
 */
export function createSearchClient(opts: { providers: SearchProvider[], cache?: KVNamespace }) {
  if (opts.providers.length === 0) throw new Error('No search provider configured')

  return {
    providers: opts.providers.map(p => p.id),

    async search(q: SearchQuery): Promise<SearchResponse> {
      const key = await cacheKey(q)
      const hit = opts.cache ? await opts.cache.get<SearchResponse>(key, 'json') : null
      if (hit) return { ...hit, cached: true }

      let lastError: unknown
      for (const provider of opts.providers) {
        try {
          const results = await provider.search(q)
          const response: SearchResponse = { provider: provider.id, cached: false, results }
          await opts.cache?.put(key, JSON.stringify(response), { expirationTtl: CACHE_TTL_S })
          return response
        }
        catch (error) {
          lastError = error
        }
      }
      throw lastError
    },
  }
}

export type SearchClient = ReturnType<typeof createSearchClient>

export function normalizeQuery(q: SearchQuery) {
  return JSON.stringify({
    query: q.query.trim().toLowerCase().replace(/\s+/g, ' '),
    domains: [...(q.domains ?? [])].sort(),
    recencyMinutes: q.recencyMinutes ?? null,
    limit: q.limit ?? null,
  })
}

async function cacheKey(q: SearchQuery) {
  const bytes = new TextEncoder().encode(normalizeQuery(q))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `search:${hex}`
}
