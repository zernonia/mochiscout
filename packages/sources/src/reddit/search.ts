import type { PageFetcher } from './about'

/**
 * Reddit's subreddit search (subreddits/search.json). Like the about pages it
 * refuses logged-out requests from datacenter IPs, so it goes through the
 * page-fetch service.
 */

export interface SubredditHit {
  /** Display name with Reddit's casing (e.g. "productivity"). */
  name: string
  subscribers: number | null
  description: string | null
}

const DESCRIPTION_MAX = 160

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'')

/** Public, safe-for-work subreddits from a search.json response (wrapped in a code fence by the fetch service). */
export function parseSubredditSearch(text: string): SubredditHit[] | null {
  const raw = text.trim().replace(/^```\w*\s*/, '').replace(/\s*```$/, '')
  let data: { data?: { children?: { data?: { display_name?: string, subscribers?: number, public_description?: string, over18?: boolean, subreddit_type?: string } }[] } }
  try {
    data = JSON.parse(raw)
  }
  catch {
    return null
  }
  if (!Array.isArray(data?.data?.children)) return null
  return data.data.children.flatMap(({ data: d }) => {
    if (!d?.display_name || d.over18 || (d.subreddit_type && d.subreddit_type !== 'public' && d.subreddit_type !== 'restricted')) return []
    const description = d.public_description ? decode(d.public_description).replace(/\s+/g, ' ').trim() : ''
    return [{
      name: d.display_name,
      subscribers: typeof d.subscribers === 'number' ? d.subscribers : null,
      description: description ? (description.length > DESCRIPTION_MAX ? `${description.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : description) : null,
    }]
  })
}

export async function searchSubreddits(pages: PageFetcher, query: string, limit = 15): Promise<SubredditHit[]> {
  const url = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
  const res = (await pages.fetch([url])).get(url)
  if (!res || 'error' in res) throw new Error(`Subreddit search failed: ${res && 'error' in res ? res.error : 'no_result'}`)
  const hits = parseSubredditSearch(res.text)
  if (!hits) throw new Error('Subreddit search failed: unparseable')
  return hits
}
