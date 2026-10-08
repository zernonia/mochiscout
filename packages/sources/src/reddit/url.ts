import { normalizeSubreddit } from './rss'

export interface RedditThreadRef {
  /** reddit:t3_<id> */
  id: string
  subreddit: string
  /** Canonical https://www.reddit.com/r/<sub>/comments/<id>/ URL. */
  url: string
}

const THREAD_PATH = /^\/r\/([\w-]+)\/comments\/([a-z0-9]+)(?:\/|$)/i

/** Recognize a Reddit thread URL from search results (www., old., np., etc.). */
export function parseRedditThreadUrl(input: string): RedditThreadRef | null {
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    return null
  }
  if (!/(^|\.)reddit\.com$/i.test(url.hostname)) return null
  const match = url.pathname.match(THREAD_PATH)
  if (!match) return null
  const subreddit = normalizeSubreddit(match[1]!)
  const id = match[2]!.toLowerCase()
  return {
    id: `reddit:t3_${id}`,
    subreddit,
    url: `https://www.reddit.com/r/${subreddit}/comments/${id}/`,
  }
}

/** Search engines title Reddit pages like "Title : r/SaaS" or "Title - Reddit". */
export function cleanRedditTitle(title: string): string {
  return title
    .replace(/\s*[:|-]\s*r\/[\w-]+\s*$/i, '')
    .replace(/\s*[-|]\s*Reddit\s*$/i, '')
    .trim()
}
