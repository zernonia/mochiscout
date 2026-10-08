import type { Http } from '../http'
import type { Post } from '../types'
import type { SourceAdapter } from './types'
import { HttpError } from '../http'
import { htmlToText, truncate } from '../text'
import { SNIPPET_MAX } from '../types'

const ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date'

interface AlgoliaHit {
  objectID: string
  author?: string
  created_at_i?: number
  title?: string | null
  story_title?: string | null
  story_text?: string | null
  comment_text?: string | null
  url?: string | null
  points?: number | null
  num_comments?: number | null
  _tags?: string[]
}

export function normalizeHnHit(hit: AlgoliaHit): Post | null {
  const isComment = hit._tags?.includes('comment') ?? Boolean(hit.comment_text)
  const title = isComment ? `Re: ${hit.story_title ?? 'HN thread'}` : hit.title
  if (!title || !hit.objectID) return null
  const body = htmlToText(hit.comment_text ?? hit.story_text ?? '')
  const engagement: Record<string, number> = {}
  if (typeof hit.points === 'number') engagement.points = hit.points
  if (typeof hit.num_comments === 'number') engagement.comments = hit.num_comments
  return {
    id: `hn:${hit.objectID}`,
    platform: 'hn',
    channel: null,
    title: htmlToText(title),
    url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    author: hit.author ?? null,
    createdAt: hit.created_at_i ? new Date(hit.created_at_i * 1000) : null,
    snippet: body ? truncate(body, SNIPPET_MAX) : null,
    engagement,
  }
}

/** Hacker News via the official Algolia search API (stories and comments). */
export function hnAdapter(http: Http): SourceAdapter {
  return {
    id: 'hn',
    label: 'Hacker News',
    async search(query, since, limit = 30) {
      const params = new URLSearchParams({
        query,
        tags: '(story,comment)',
        numericFilters: `created_at_i>${Math.floor(since.getTime() / 1000)}`,
        hitsPerPage: String(Math.min(limit, 100)),
      })
      const url = `${ENDPOINT}?${params}`
      const res = await http.getText(url, { headers: { Accept: 'application/json' } })
      if (res.status !== 'ok') throw new HttpError(url, 304)
      const data = JSON.parse(res.body) as { hits?: AlgoliaHit[] }
      return (data.hits ?? []).map(normalizeHnHit).filter((p): p is Post => p !== null)
    },
  }
}
