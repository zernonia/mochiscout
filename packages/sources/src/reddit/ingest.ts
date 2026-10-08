import type { Post } from '../types'
import { htmlToText, truncate } from '../text'
import { SNIPPET_MAX } from '../types'
import { normalizeSubreddit } from './rss'

/** A post as the browser extension reads it from a reddit.com page. */
export interface ExtensionPost {
  fullname: string
  subreddit: string
  title: string
  permalink: string
  author?: string | null
  createdAt?: string | number | null
  body?: string | null
}

/** Validate and normalize posts sent by the extension; drops anything that isn't a plain Reddit post. */
export function normalizeExtensionPost(p: ExtensionPost): Post | null {
  if (!/^t3_[a-z0-9]{2,12}$/i.test(p.fullname)) return null
  const subreddit = normalizeSubreddit(p.subreddit)
  if (!/^\w{2,21}$/.test(subreddit)) return null
  const title = p.title?.trim()
  if (!title) return null
  const id = p.fullname.slice(3).toLowerCase()
  const created = typeof p.createdAt === 'number' ? p.createdAt : Date.parse(p.createdAt ?? '')
  const body = p.body ? htmlToText(p.body) : ''
  return {
    id: `reddit:t3_${id}`,
    platform: 'reddit',
    channel: subreddit,
    title: truncate(title, 300),
    // Rebuilt from the id, never trusted from the page.
    url: `https://www.reddit.com/r/${subreddit}/comments/${id}/`,
    author: p.author?.replace(/^u\//, '') || null,
    createdAt: Number.isFinite(created) ? new Date(created) : null,
    snippet: body ? truncate(body, SNIPPET_MAX) : null,
  }
}
