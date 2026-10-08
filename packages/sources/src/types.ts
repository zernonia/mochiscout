export type Platform = 'reddit' | 'hn' | 'bluesky' | 'x' | 'web'

/** Normalized post, ready to upsert into `threads`. */
export interface Post {
  /** Source-prefixed id: reddit:t3_*, hn:123, … */
  id: string
  platform: Platform
  /** Subreddit (lowercase) for Reddit, null elsewhere. */
  channel: string | null
  title: string
  url: string
  author: string | null
  /** Null when unknown (e.g. only seen in web search results). */
  createdAt: Date | null
  /** Plain text, ≤ 500 chars. */
  snippet: string | null
  /** Points, comments, likes… as the platform reports them. */
  engagement?: Record<string, number>
}

export const SNIPPET_MAX = 500
