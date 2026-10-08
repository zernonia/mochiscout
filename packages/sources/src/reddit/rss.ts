import type { Post } from '../types'
import { XMLParser } from 'fast-xml-parser'
import { decodeEntities, htmlToText, truncate } from '../text'
import { SNIPPET_MAX } from '../types'

const BASE = 'https://www.reddit.com'

/** Reddit allows up to 100 entries per feed. */
export const FEED_LIMIT = 100

export function normalizeSubreddit(name: string) {
  return name.replace(/^\/?r\//i, '').trim().toLowerCase()
}

/**
 * Newest posts across one or more subreddits in a single request
 * (`/r/a+b+c/new/.rss`). Combining subs keeps request volume low.
 */
export function newPostsFeedUrl(subreddits: string[], limit = FEED_LIMIT) {
  if (subreddits.length === 0) throw new Error('No subreddits')
  const path = subreddits.map(normalizeSubreddit).map(encodeURIComponent).join('+')
  return `${BASE}/r/${path}/new/.rss?limit=${limit}`
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Entities are decoded by decodeEntities so numeric ones (&#39;) work too.
  processEntities: false,
  isArray: name => name === 'entry' || name === 'link' || name === 'category',
})

interface AtomEntry {
  id?: string
  title?: string | { '#text': string }
  link?: { href?: string }[]
  author?: { name?: string }
  category?: { term?: string }[]
  published?: string
  updated?: string
  content?: string | { '#text'?: string }
}

function text(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && '#text' in value) return String((value as { '#text': unknown })['#text'] ?? '')
  return value == null ? '' : String(value)
}

/** The post body is the `<div class="md">` before Reddit's "submitted by … [link] [comments]" footer. */
function snippetFrom(contentHtml: string): string | null {
  const match = contentHtml.match(/<!-- SC_OFF -->([\s\S]*?)<!-- SC_ON -->/)
  if (!match?.[1]) return null
  const body = htmlToText(match[1])
  return body ? truncate(body, SNIPPET_MAX) : null
}

export function parseRedditFeed(xml: string): Post[] {
  const doc = parser.parse(xml) as { feed?: { entry?: AtomEntry[] } }
  const entries = doc.feed?.entry ?? []
  const posts: Post[] = []

  for (const entry of entries) {
    const fullname = text(entry.id)
    if (!fullname.startsWith('t3_')) continue
    const url = entry.link?.[0]?.href
    const created = Date.parse(text(entry.published) || text(entry.updated))
    if (!url || Number.isNaN(created)) continue

    const author = text(entry.author?.name).replace(/^\/u\//, '') || null
    const sub = entry.category?.[0]?.term

    posts.push({
      id: `reddit:${fullname}`,
      platform: 'reddit',
      channel: sub ? normalizeSubreddit(sub) : null,
      title: decodeEntities(text(entry.title)).trim(),
      url: decodeEntities(url),
      author,
      createdAt: new Date(created),
      snippet: snippetFrom(decodeEntities(text(entry.content))),
    })
  }
  return posts
}
