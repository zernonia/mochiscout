export type SearchProviderId = 'tinyfish' | 'brave'

export interface SearchQuery {
  query: string
  /** Only results from these domains, e.g. ['reddit.com']. */
  domains?: string[]
  /** Only results newer than this many minutes. */
  recencyMinutes?: number
  /** What the search is for; TinyFish uses it to steer results. */
  purpose?: string
  limit?: number
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  position: number
}

export interface SearchProvider {
  id: SearchProviderId
  search: (q: SearchQuery) => Promise<SearchResult[]>
}
