import type { Http } from './http'
import { XMLParser } from 'fast-xml-parser'
import { HttpError } from './http'
import { decodeEntities, htmlToText } from './text'

/**
 * Is the founder's posted reply still up? Reads the reply's public page or
 * API: Reddit comment feeds, the HN Algolia item API and Bluesky's public
 * AppView. X has no free read API, so X replies stay 'unknown'.
 */
export type ReplyStatus = 'live' | 'removed' | 'unknown'

export interface ReplyRef {
  platform: 'reddit' | 'hn' | 'bluesky' | 'x'
  /** URL to fetch for its status, or null when it can't be checked. */
  checkUrl: string | null
  /** Reddit comment fullname (t1_…), HN item id, Bluesky at:// URI. */
  id: string | null
  /** The link rebuilt from the parsed parts (https only), safe to store and render. */
  url: string
}

/** Recognize a reply link pasted by the user. Returns null for anything else. */
export function parseReplyUrl(input: string): ReplyRef | null {
  let url: URL
  try {
    url = new URL(input.trim())
  }
  catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^(www|old|new|np)\./, '')
  if (host === 'reddit.com') {
    const m = url.pathname.match(/^\/r\/([\w-]+)\/comments\/([a-z0-9]+)\/[^/]*\/([a-z0-9]+)\/?$/i)
    if (!m) return null
    return { platform: 'reddit', id: `t1_${m[3]!.toLowerCase()}`, checkUrl: `https://www.reddit.com/r/${m[1]}/comments/${m[2]}/_/${m[3]}/.rss`, url: `https://www.reddit.com/r/${m[1]}/comments/${m[2]}/_/${m[3]}/` }
  }
  if (host === 'news.ycombinator.com') {
    const id = url.searchParams.get('id')
    if (url.pathname !== '/item' || !id || !/^\d+$/.test(id)) return null
    return { platform: 'hn', id, checkUrl: `https://hn.algolia.com/api/v1/items/${id}`, url: `https://news.ycombinator.com/item?id=${id}` }
  }
  if (host === 'bsky.app') {
    const m = url.pathname.match(/^\/profile\/([\w.:-]+)\/post\/([a-z0-9]+)\/?$/i)
    if (!m) return null
    const uri = `at://${m[1]}/app.bsky.feed.post/${m[2]}`
    return { platform: 'bluesky', id: uri, checkUrl: `https://api.bsky.app/xrpc/app.bsky.feed.getPostThread?${new URLSearchParams({ uri, depth: '0', parentHeight: '0' })}`, url: `https://bsky.app/profile/${m[1]}/post/${m[2]}` }
  }
  if (host === 'x.com' || host === 'twitter.com') {
    const m = url.pathname.match(/^\/(\w+)\/status\/(\d+)\/?$/)
    return m ? { platform: 'x', id: m[2]!, checkUrl: null, url: `https://x.com/${m[1]}/status/${m[2]}` } : null
  }
  return null
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', processEntities: false, isArray: name => name === 'entry' })

export async function checkReplyStatus(http: Http, ref: ReplyRef): Promise<ReplyStatus> {
  if (!ref.checkUrl) return 'unknown'
  try {
    const res = await http.getText(ref.checkUrl, ref.platform === 'reddit' ? {} : { headers: { Accept: 'application/json' } })
    if (res.status !== 'ok') return 'unknown'

    if (ref.platform === 'reddit') {
      const doc = parser.parse(res.body) as { feed?: { entry?: Record<string, any>[] } }
      const entry = doc.feed?.entry?.find(e => String(e.id ?? '') === ref.id)
      if (!entry) return 'removed'
      const raw = typeof entry.content === 'string' ? entry.content : String(entry.content?.['#text'] ?? '')
      const text = htmlToText(decodeEntities(raw)).trim()
      return text === '[removed]' || text === '[deleted]' ? 'removed' : 'live'
    }
    if (ref.platform === 'hn') {
      const item = JSON.parse(res.body) as { author?: string | null, text?: string | null }
      return item.author && item.text ? 'live' : 'removed'
    }
    const data = JSON.parse(res.body) as { thread?: { $type?: string, post?: unknown } }
    return data.thread?.post ? 'live' : 'removed'
  }
  catch (error) {
    if (error instanceof HttpError && (error.status === 404 || (ref.platform === 'bluesky' && error.status === 400))) return 'removed'
    throw error
  }
}
