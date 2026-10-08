import { XMLParser } from 'fast-xml-parser'
import { decodeEntities, htmlToText } from '../text'
import { normalizeSubreddit } from './rss'

const BASE = 'https://www.reddit.com'

export function postFeedUrl(subreddit: string, postId: string) {
  return `${BASE}/r/${encodeURIComponent(normalizeSubreddit(subreddit))}/comments/${encodeURIComponent(postId.replace(/^t3_/, ''))}/.rss`
}

export function userFeedUrl(username: string) {
  return `${BASE}/user/${encodeURIComponent(username)}/.rss`
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  processEntities: false,
  isArray: name => name === 'entry' || name === 'link',
})

export interface PostStatus {
  status: 'live' | 'removed' | 'deleted'
  title: string | null
  author: string | null
  publishedAt: Date | null
}

/**
 * A post's comments feed starts with the post itself. Removed posts show
 * "[removed]" as their body to logged-out readers; posts deleted by their
 * author show "[deleted]".
 */
export function parsePostStatus(xml: string, postId: string): PostStatus | null {
  const doc = parser.parse(xml) as { feed?: { entry?: Record<string, any>[] } }
  const id = `t3_${postId.replace(/^t3_/, '')}`
  const entry = doc.feed?.entry?.find(e => String(e.id ?? '') === id)
  if (!entry) return null

  const contentRaw = typeof entry.content === 'string' ? entry.content : String(entry.content?.['#text'] ?? '')
  const body = htmlToText(decodeEntities(contentRaw).match(/<!-- SC_OFF -->([\s\S]*?)<!-- SC_ON -->/)?.[1] ?? '').trim()
  const author = String(entry.author?.name ?? '').replace(/^\/u\//, '') || null
  const published = Date.parse(String(entry.published ?? entry.updated ?? ''))
  const title = entry.title ? decodeEntities(String(typeof entry.title === 'string' ? entry.title : entry.title['#text'] ?? '')) : null

  let status: PostStatus['status'] = 'live'
  if (body === '[removed]') status = 'removed'
  else if (body === '[deleted]' || author === '[deleted]' || !author) status = 'deleted'

  return { status, title, author, publishedAt: Number.isNaN(published) ? null : new Date(published) }
}
