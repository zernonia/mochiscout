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

/** Someone's comment under the founder's reply. */
export interface ReplyResponse {
  /** Reddit comment fullname (t1_…), HN item id, Bluesky at:// URI. */
  id: string
  author: string | null
  text: string
  /** Rebuilt from parsed parts, safe to render. */
  url: string
  createdAt: Date | null
}

export interface ReplyThreadState {
  status: ReplyStatus
  /** The founder's reply as it reads now (null when gone or unreadable). */
  text: string | null
  /** Everyone else's comments under it, oldest first. */
  responses: ReplyResponse[]
}

const RESPONSES_MAX = 50
const RESPONSE_TEXT_MAX = 2000
const BLUESKY_DEPTH = 6
const UNKNOWN: ReplyThreadState = { status: 'unknown', text: null, responses: [] }

const clip = (text: string) => (text.length > RESPONSE_TEXT_MAX ? `${text.slice(0, RESPONSE_TEXT_MAX - 1).trimEnd()}…` : text)
const date = (value: unknown) => {
  const d = typeof value === 'string' ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

/**
 * The founder's posted reply and what people have written under it since.
 * Reddit's comment feed lists the comment's whole reply tree without saying
 * who answered whom, so everyone in it except the founder counts.
 */
export async function readReplyThread(http: Http, ref: ReplyRef): Promise<ReplyThreadState> {
  if (!ref.checkUrl) return UNKNOWN
  const url = ref.platform === 'bluesky'
    ? `https://api.bsky.app/xrpc/app.bsky.feed.getPostThread?${new URLSearchParams({ uri: ref.id!, depth: String(BLUESKY_DEPTH), parentHeight: '0' })}`
    : ref.checkUrl
  try {
    const res = await http.getText(url, ref.platform === 'reddit' ? {} : { headers: { Accept: 'application/json' } })
    if (res.status !== 'ok') return UNKNOWN
    if (ref.platform === 'reddit') return readRedditFeed(res.body, ref)
    if (ref.platform === 'hn') return readHnItem(res.body)
    return readBlueskyThread(res.body)
  }
  catch (error) {
    if (error instanceof HttpError && (error.status === 404 || (ref.platform === 'bluesky' && error.status === 400))) return { status: 'removed', text: null, responses: [] }
    throw error
  }
}

function readRedditFeed(body: string, ref: ReplyRef): ReplyThreadState {
  const doc = parser.parse(body) as { feed?: { entry?: Record<string, any>[] } }
  const entries = doc.feed?.entry ?? []
  const text = (e: Record<string, any>) => {
    const raw = typeof e.content === 'string' ? e.content : String(e.content?.['#text'] ?? '')
    return htmlToText(decodeEntities(raw)).trim()
  }
  const author = (e: Record<string, any>) => String(e.author?.name ?? '').replace(/^\/?u\//, '') || null
  const own = entries.find(e => String(e.id ?? '') === ref.id)
  if (!own) return { status: 'removed', text: null, responses: [] }
  const ownText = text(own)
  if (ownText === '[removed]' || ownText === '[deleted]') return { status: 'removed', text: null, responses: [] }
  const me = author(own)
  const responses: ReplyResponse[] = []
  for (const e of entries) {
    const id = String(e.id ?? '')
    if (!id.startsWith('t1_') || id === ref.id) continue
    const who = author(e)
    const body = text(e)
    const link = parseReplyUrl(String(e.link?.href ?? ''))
    if ((me && who === me) || !body || body === '[removed]' || body === '[deleted]' || !link) continue
    responses.push({ id, author: who, text: clip(body), url: link.url, createdAt: date(e.published ?? e.updated) })
  }
  return { status: 'live', text: ownText, responses: responses.slice(0, RESPONSES_MAX) }
}

interface HnItem { id?: number, author?: string | null, text?: string | null, created_at?: string, children?: HnItem[] }
function readHnItem(body: string): ReplyThreadState {
  const item = JSON.parse(body) as HnItem
  if (!item.author || !item.text) return { status: 'removed', text: null, responses: [] }
  const responses: ReplyResponse[] = []
  const walk = (children: HnItem[] = []) => {
    for (const c of children) {
      if (c.id && c.author && c.text && c.author !== item.author) {
        responses.push({ id: String(c.id), author: c.author, text: clip(htmlToText(decodeEntities(c.text)).trim()), url: `https://news.ycombinator.com/item?id=${c.id}`, createdAt: date(c.created_at) })
      }
      walk(c.children)
    }
  }
  walk(item.children)
  return { status: 'live', text: htmlToText(decodeEntities(item.text)).trim(), responses: sortByDate(responses).slice(0, RESPONSES_MAX) }
}

interface BskyNode { post?: { uri?: string, author?: { handle?: string }, record?: { text?: string, createdAt?: string } }, replies?: BskyNode[] }
function readBlueskyThread(body: string): ReplyThreadState {
  const data = JSON.parse(body) as { thread?: BskyNode }
  const root = data.thread?.post
  if (!root) return { status: 'removed', text: null, responses: [] }
  const me = root.author?.handle
  const responses: ReplyResponse[] = []
  const walk = (nodes: BskyNode[] = []) => {
    for (const n of nodes) {
      const p = n.post
      const rkey = p?.uri?.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([a-z0-9]+)$/i)?.[1]
      const handle = p?.author?.handle
      if (p?.uri && rkey && handle && /^[\w.:-]+$/.test(handle) && handle !== me && p.record?.text) {
        responses.push({ id: p.uri, author: handle, text: clip(p.record.text.trim()), url: `https://bsky.app/profile/${handle}/post/${rkey}`, createdAt: date(p.record.createdAt) })
      }
      walk(n.replies)
    }
  }
  walk(data.thread?.replies)
  return { status: 'live', text: root.record?.text?.trim() ?? null, responses: sortByDate(responses).slice(0, RESPONSES_MAX) }
}

function sortByDate(list: ReplyResponse[]) {
  return list.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
}

export async function checkReplyStatus(http: Http, ref: ReplyRef): Promise<ReplyStatus> {
  return (await readReplyThread(http, ref)).status
}
