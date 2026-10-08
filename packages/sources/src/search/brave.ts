import type { Http } from '../http'
import type { SearchProvider, SearchQuery, SearchResult } from './types'
import { HttpError } from '../http'
import { htmlToText } from '../text'

const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

interface BraveResponse {
  web?: { results?: { title?: string, url?: string, description?: string }[] }
}

function freshness(minutes?: number) {
  if (!minutes) return undefined
  if (minutes <= 1440) return 'pd'
  if (minutes <= 7 * 1440) return 'pw'
  if (minutes <= 31 * 1440) return 'pm'
  return 'py'
}

/** Brave Search API: paid fallback (~$5 / 1k requests). */
export function brave(http: Http, apiKey: string): SearchProvider {
  return {
    id: 'brave',
    async search(q: SearchQuery): Promise<SearchResult[]> {
      const sites = q.domains?.map(d => `site:${d}`).join(' OR ')
      const params = new URLSearchParams({
        q: sites ? `${q.query} (${sites})` : q.query,
        count: String(Math.min(q.limit ?? 20, 20)),
      })
      const f = freshness(q.recencyMinutes)
      if (f) params.set('freshness', f)

      const url = `${ENDPOINT}?${params}`
      const res = await http.getText(url, {
        headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' },
      })
      if (res.status !== 'ok') throw new HttpError(url, 304)

      const data = JSON.parse(res.body) as BraveResponse
      return (data.web?.results ?? [])
        .filter(r => r.url && r.title)
        .map((r, i) => ({
          title: htmlToText(r.title!),
          url: r.url!,
          snippet: htmlToText(r.description ?? ''),
          position: i + 1,
        }))
    },
  }
}
