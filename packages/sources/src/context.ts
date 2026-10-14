import type { Http } from './http'
import type { Platform } from './types'
import { XMLParser } from 'fast-xml-parser'
import { HttpError } from './http'
import { postFeedUrl } from './reddit/status'
import { decodeEntities, htmlToText, truncate } from './text'
import { parseReplyUrl } from './reply-status'

/**
 * Whether a thread can still be answered, plus the full post and top comments
 * for drafting a reply that fits the conversation.
 */
export type ThreadState = 'open' | 'archived' | 'locked' | 'removed' | 'deleted'

export interface ThreadComment {
  author: string | null
  text: string
  score?: number
  /** Link to the comment itself, rebuilt from parsed parts (older rows have none). */
  url?: string
}

export interface ThreadContext {
  state: ThreadState
  /** Post date when the source reports it (search results often have none). */
  createdAt: Date | null
  body: string | null
  comments: ThreadComment[]
  /** Replies seen (a lower bound when the feed is capped). */
  commentCount: number | null
}

export const BODY_MAX = 4000
export const COMMENT_MAX = 500
export const COMMENTS_KEPT = 12

/** Reddit archives posts after ~6 months by default; HN stops replies after 2 weeks. */
export const REDDIT_ARCHIVE_DAYS = 180
export const HN_REPLY_DAYS = 14

const DAY_MS = 86_400_000

/** Closed by age alone, before (or without) fetching anything. */
export function stateFromAge(platform: string, createdAt: Date | null, now: Date, id?: string): ThreadState | null {
  // Reddit ids are base36 and increasing; 6-character ids predate 2023, so the post is long archived.
  if (platform === 'reddit' && id && /^reddit:t3_[a-z0-9]{1,6}$/.test(id)) return 'archived'
  if (!createdAt) return null
  const days = (now.getTime() - createdAt.getTime()) / DAY_MS
  if (platform === 'reddit' && days > REDDIT_ARCHIVE_DAYS) return 'archived'
  if (platform === 'hn' && days > HN_REPLY_DAYS) return 'archived'
  return null
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  processEntities: false,
  isArray: name => name === 'entry' || name === 'link',
})

/** The self-text between Reddit's SC_OFF/SC_ON markers; link posts have none ("submitted by …" only). */
function entryText(entry: Record<string, any>, strict: boolean) {
  const raw = typeof entry.content === 'string' ? entry.content : String(entry.content?.['#text'] ?? '')
  const html = decodeEntities(raw)
  const md = html.match(/<!-- SC_OFF -->([\s\S]*?)<!-- SC_ON -->/)?.[1]
  return htmlToText(md ?? (strict ? '' : html)).trim()
}

const entryAuthor = (entry: Record<string, any>) => String(entry.author?.name ?? '').replace(/^\/u\//, '') || null

/** A Reddit post's comments feed: the post first, then its comments in the sub's default order. */
export function parseRedditThread(xml: string, postId: string): Omit<ThreadContext, 'state'> & { status: 'live' | 'removed' | 'deleted' } | null {
  const doc = parser.parse(xml) as { feed?: { entry?: Record<string, any>[] } }
  const entries = doc.feed?.entry ?? []
  const id = `t3_${postId.replace(/^t3_/, '')}`
  const post = entries.find(e => String(e.id ?? '') === id)
  if (!post) return null

  const body = entryText(post, true)
  const author = entryAuthor(post)
  const published = Date.parse(String(post.published ?? post.updated ?? ''))
  let status: 'live' | 'removed' | 'deleted' = 'live'
  if (body === '[removed]') status = 'removed'
  else if (body === '[deleted]' || author === '[deleted]' || !author) status = 'deleted'

  const comments = entries
    .filter(e => e !== post)
    .map((e) => {
      const link = parseReplyUrl(String((Array.isArray(e.link) ? e.link[0] : e.link)?.href ?? ''))
      return { author: entryAuthor(e), text: entryText(e, false), ...(link ? { url: link.url } : {}) }
    })
    .filter(c => c.text && c.text !== '[removed]' && c.text !== '[deleted]')

  return {
    status,
    createdAt: Number.isNaN(published) ? null : new Date(published),
    body: status === 'live' && body ? truncate(body, BODY_MAX) : null,
    comments: comments.slice(0, COMMENTS_KEPT).map(c => ({ ...c, text: truncate(c.text, COMMENT_MAX) })),
    commentCount: comments.length,
  }
}

interface HnItem {
  id: number
  created_at_i?: number
  author?: string | null
  title?: string | null
  text?: string | null
  points?: number | null
  children?: HnItem[]
}

function countHn(items: HnItem[] = []): number {
  return items.reduce((n, c) => n + (c.text ? 1 : 0) + countHn(c.children), 0)
}

export function parseHnItem(item: HnItem): Omit<ThreadContext, 'state'> & { deleted: boolean } {
  const children = (item.children ?? []).filter(c => c.text)
  return {
    deleted: !item.author && !item.text && !item.title,
    createdAt: item.created_at_i ? new Date(item.created_at_i * 1000) : null,
    body: item.text ? truncate(htmlToText(item.text), BODY_MAX) : null,
    comments: children.slice(0, COMMENTS_KEPT).map(c => ({
      author: c.author ?? null,
      text: truncate(htmlToText(c.text!), COMMENT_MAX),
      ...(typeof c.points === 'number' ? { score: c.points } : {}),
      url: `https://news.ycombinator.com/item?id=${c.id}`,
    })),
    commentCount: countHn(item.children),
  }
}

interface BskyThreadView {
  $type?: string
  post?: {
    uri?: string
    author?: { handle?: string }
    record?: { text?: string, createdAt?: string }
    likeCount?: number
    replyCount?: number
    threadgate?: { record?: { allow?: unknown[] } }
  }
  replies?: BskyThreadView[]
}

function bskyLink(uri: string | undefined, handle: string | undefined) {
  const rkey = uri?.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([a-z0-9]+)$/i)?.[1]
  return rkey && handle && /^[\w.:-]+$/.test(handle) ? { url: `https://bsky.app/profile/${handle}/post/${rkey}` } : {}
}

export function parseBskyThread(thread: BskyThreadView | undefined): ThreadContext {
  if (!thread?.post || thread.$type?.endsWith('#notFoundPost') || thread.$type?.endsWith('#blockedPost')) {
    return { state: 'deleted', createdAt: null, body: null, comments: [], commentCount: null }
  }
  const { post } = thread
  const created = Date.parse(post.record?.createdAt ?? '')
  // A threadgate with an empty allow list means nobody can reply.
  const allow = post.threadgate?.record?.allow
  const replies = (thread.replies ?? []).filter(r => r.post?.record?.text)
  return {
    state: Array.isArray(allow) && allow.length === 0 ? 'locked' : 'open',
    createdAt: Number.isNaN(created) ? null : new Date(created),
    body: post.record?.text ? truncate(post.record.text, BODY_MAX) : null,
    comments: replies
      .sort((a, b) => (b.post?.likeCount ?? 0) - (a.post?.likeCount ?? 0))
      .slice(0, COMMENTS_KEPT)
      .map(r => ({
        author: r.post?.author?.handle ?? null,
        text: truncate(r.post!.record!.text!, COMMENT_MAX),
        ...(typeof r.post?.likeCount === 'number' ? { score: r.post.likeCount } : {}),
        ...bskyLink(r.post?.uri, r.post?.author?.handle),
      })),
    commentCount: post.replyCount ?? replies.length,
  }
}

export interface ContextTarget {
  id: string
  platform: Platform
  channel: string | null
  createdAt: Date | null
}

/**
 * Fetch a thread's state, full text and top comments. Returns null for
 * platforms we can't read (X: paid API; web). Throws HttpDeferredError when
 * rate-limited so callers can retry later.
 */
export async function fetchThreadContext(http: Http, target: ContextTarget, now = new Date()): Promise<ThreadContext | null> {
  const byAge = stateFromAge(target.platform, target.createdAt, now, target.id)

  if (target.platform === 'reddit') {
    // Long archived: skip the request (Reddit reads are the scarcest).
    if (byAge) return { state: byAge, createdAt: target.createdAt, body: null, comments: [], commentCount: null }
    const postId = target.id.replace(/^reddit:t3_/, '')
    if (!target.channel) return null
    let parsed: ReturnType<typeof parseRedditThread>
    try {
      const res = await http.getText(postFeedUrl(target.channel, postId))
      if (res.status !== 'ok') return null
      parsed = parseRedditThread(res.body, postId)
    }
    catch (error) {
      // 404: the post or its sub is gone. (403 is left alone: Reddit also answers 403 when it blocks a client.)
      if (error instanceof HttpError && error.status === 404) {
        return { state: 'removed', createdAt: target.createdAt, body: null, comments: [], commentCount: null }
      }
      throw error
    }
    if (!parsed) return null
    const { status, ...rest } = parsed
    const state: ThreadState = status === 'live'
      ? stateFromAge('reddit', rest.createdAt ?? target.createdAt, now) ?? 'open'
      : status
    return { ...rest, state }
  }

  if (target.platform === 'hn') {
    const itemId = target.id.replace(/^hn:/, '')
    try {
      const res = await http.getText(`https://hn.algolia.com/api/v1/items/${encodeURIComponent(itemId)}`, { headers: { Accept: 'application/json' } })
      if (res.status !== 'ok') return null
      const { deleted, ...rest } = parseHnItem(JSON.parse(res.body) as HnItem)
      return { ...rest, state: deleted ? 'deleted' : stateFromAge('hn', rest.createdAt ?? target.createdAt, now) ?? 'open' }
    }
    catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return { state: 'deleted', createdAt: target.createdAt, body: null, comments: [], commentCount: null }
      }
      throw error
    }
  }

  if (target.platform === 'bluesky') {
    const uri = target.id.replace(/^bsky:/, '')
    const params = new URLSearchParams({ uri, depth: '1', parentHeight: '0' })
    try {
      const res = await http.getText(`https://api.bsky.app/xrpc/app.bsky.feed.getPostThread?${params}`, { headers: { Accept: 'application/json' } })
      if (res.status !== 'ok') return null
      return parseBskyThread((JSON.parse(res.body) as { thread?: BskyThreadView }).thread)
    }
    catch (error) {
      // The API answers 400 NotFound for deleted posts.
      if (error instanceof HttpError && (error.status === 400 || error.status === 404)) {
        return { state: 'deleted', createdAt: target.createdAt, body: null, comments: [], commentCount: null }
      }
      throw error
    }
  }

  return byAge ? { state: byAge, createdAt: target.createdAt, body: null, comments: [], commentCount: null } : null
}
