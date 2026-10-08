import type { Http } from '../http'
import type { Post } from '../types'
import type { SourceAdapter } from './types'
import { HttpError } from '../http'
import { truncate } from '../text'
import { SNIPPET_MAX } from '../types'

const ENDPOINT = 'https://api.x.com/2/tweets/search/recent'
const TITLE_MAX = 140
/** Recent search only covers the last 7 days. */
const MAX_WINDOW_MS = 7 * 86_400_000 - 60_000

interface XPost {
  id: string
  text: string
  created_at?: string
  author_id?: string
  public_metrics?: { like_count?: number, reply_count?: number, repost_count?: number, quote_count?: number }
}

interface XSearchResponse {
  data?: XPost[]
  includes?: { users?: { id: string, username: string }[] }
}

export function normalizeXResponse(res: XSearchResponse): Post[] {
  const usernames = new Map((res.includes?.users ?? []).map(u => [u.id, u.username]))
  return (res.data ?? []).flatMap((p) => {
    const username = p.author_id ? usernames.get(p.author_id) : undefined
    const text = p.text.trim()
    if (!username || !text) return []
    const created = Date.parse(p.created_at ?? '')
    const m = p.public_metrics ?? {}
    const engagement: Record<string, number> = {}
    if (typeof m.like_count === 'number') engagement.likes = m.like_count
    if (typeof m.reply_count === 'number') engagement.replies = m.reply_count
    if (typeof m.repost_count === 'number') engagement.reposts = m.repost_count
    return [{
      id: `x:${p.id}`,
      platform: 'x' as const,
      channel: null,
      title: truncate(text.split('\n')[0]!, TITLE_MAX),
      url: `https://x.com/${username}/status/${p.id}`,
      author: username,
      createdAt: Number.isNaN(created) ? null : new Date(created),
      snippet: truncate(text, SNIPPET_MAX),
      engagement,
    }]
  })
}

/** X official API v2 recent search (paid; Pro plan only). Retweets excluded. */
export function xAdapter(http: Http, bearerToken: string): SourceAdapter {
  return {
    id: 'x',
    label: 'X',
    async search(query, since, limit = 25) {
      const start = new Date(Math.max(since.getTime(), Date.now() - MAX_WINDOW_MS))
      const params = new URLSearchParams({
        'query': `${query} -is:retweet`,
        'max_results': String(Math.min(Math.max(limit, 10), 100)),
        'start_time': start.toISOString(),
        'sort_order': 'recency',
        'post.fields': 'created_at,public_metrics',
        'expansions': 'author_id',
        'user.fields': 'username',
      })
      const url = `${ENDPOINT}?${params}`
      const res = await http.getText(url, { headers: { Authorization: `Bearer ${bearerToken}`, Accept: 'application/json' } })
      if (res.status !== 'ok') throw new HttpError(url, 304)
      return normalizeXResponse(JSON.parse(res.body) as XSearchResponse)
    },
  }
}
