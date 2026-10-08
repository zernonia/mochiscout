import type { Http } from '../http'
import type { SearchProvider, SearchQuery, SearchResult } from './types'
import { HttpError } from '../http'

const ENDPOINT = 'https://api.search.tinyfish.ai'
const MAX_RECENCY_MINUTES = 5_256_000

interface TinyFishResponse {
  results?: { position?: number, title?: string, snippet?: string, url?: string }[]
}

/** TinyFish Search: free, 30 req/min and 500 req/hour per key. */
export function tinyfish(http: Http, apiKey: string): SearchProvider {
  return {
    id: 'tinyfish',
    async search(q: SearchQuery): Promise<SearchResult[]> {
      const params = new URLSearchParams({ query: q.query })
      if (q.domains?.length) params.set('include_domains', q.domains.join(','))
      if (q.recencyMinutes) params.set('recency_minutes', String(Math.min(Math.round(q.recencyMinutes), MAX_RECENCY_MINUTES)))
      if (q.purpose) params.set('purpose', q.purpose.slice(0, 2000))

      const url = `${ENDPOINT}?${params}`
      const res = await http.getText(url, { headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' } })
      if (res.status !== 'ok') throw new HttpError(url, 304)

      const data = JSON.parse(res.body) as TinyFishResponse
      return (data.results ?? [])
        .filter(r => r.url && r.title)
        .slice(0, q.limit ?? 20)
        .map((r, i) => ({
          title: r.title!,
          url: r.url!,
          snippet: r.snippet ?? '',
          position: r.position ?? i + 1,
        }))
    },
  }
}
