import type { Http } from '../http'
import type { Post } from '../types'
import type { SourceAdapter } from './types'
import { HttpError } from '../http'
import { truncate } from '../text'
import { SNIPPET_MAX } from '../types'

const ENDPOINT = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts'
const TITLE_MAX = 140

interface BskyPost {
  uri: string
  author?: { handle?: string }
  record?: { text?: string, createdAt?: string }
  indexedAt?: string
  likeCount?: number
  replyCount?: number
  repostCount?: number
}

export function normalizeBskyPost(p: BskyPost): Post | null {
  const rkey = p.uri.split('/').pop()
  const handle = p.author?.handle
  const text = (p.record?.text ?? '').trim()
  if (!rkey || !handle || !text) return null
  const created = Date.parse(p.record?.createdAt ?? p.indexedAt ?? '')
  const firstLine = text.split('\n')[0]!
  const engagement: Record<string, number> = {}
  if (typeof p.likeCount === 'number') engagement.likes = p.likeCount
  if (typeof p.replyCount === 'number') engagement.replies = p.replyCount
  if (typeof p.repostCount === 'number') engagement.reposts = p.repostCount
  return {
    id: `bsky:${p.uri}`,
    platform: 'bluesky',
    channel: null,
    title: truncate(firstLine, TITLE_MAX),
    url: `https://bsky.app/profile/${handle}/post/${rkey}`,
    author: handle,
    createdAt: Number.isNaN(created) ? null : new Date(created),
    snippet: truncate(text, SNIPPET_MAX),
    engagement,
  }
}

/** Bluesky public post search (AT Protocol app.bsky.feed.searchPosts). */
export function blueskyAdapter(http: Http): SourceAdapter {
  return {
    id: 'bluesky',
    label: 'Bluesky',
    async search(query, since, limit = 30) {
      const params = new URLSearchParams({
        q: query,
        sort: 'latest',
        since: since.toISOString(),
        limit: String(Math.min(limit, 100)),
      })
      const url = `${ENDPOINT}?${params}`
      const res = await http.getText(url, { headers: { Accept: 'application/json' } })
      if (res.status !== 'ok') throw new HttpError(url, 304)
      const data = JSON.parse(res.body) as { posts?: BskyPost[] }
      return (data.posts ?? []).map(normalizeBskyPost).filter((p): p is Post => p !== null)
    },
  }
}
