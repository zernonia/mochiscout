/**
 * A subreddit's official rules and public info (about/rules.json and
 * about.json). Reddit blocks these for logged-out requests from datacenter
 * IPs, so they are read through a page-fetch service (TinyFish Fetch) that
 * returns the JSON as text.
 */

export interface PageFetcher {
  /** Up to 10 URLs. Each URL maps to its text, or to an error code ('page_not_found', 'login_required', ...). */
  fetch: (urls: string[]) => Promise<Map<string, { text: string } | { error: string }>>
}

const FETCH_ENDPOINT = 'https://api.fetch.tinyfish.ai'

interface FetchResponse {
  results?: { url: string, text?: string | null }[]
  errors?: { url: string, error: string }[]
}

/** TinyFish Fetch: free up to 1,000 URLs a day, 150 URLs a minute per key. */
export function tinyfishFetcher(apiKey: string, opts: { fetch?: typeof fetch, ttlSeconds?: number } = {}): PageFetcher {
  const doFetch = opts.fetch ?? fetch
  return {
    async fetch(urls) {
      const res = await doFetch(FETCH_ENDPOINT, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, format: 'markdown', links: false, image_links: false, iframe_links: false, page_metadata: false, ttl: opts.ttlSeconds ?? 3600 }),
      })
      if (!res.ok) {
        await res.body?.cancel()
        throw new Error(`TinyFish fetch failed with ${res.status}`)
      }
      const data = await res.json() as FetchResponse
      const out = new Map<string, { text: string } | { error: string }>()
      for (const r of data.results ?? []) out.set(r.url, r.text ? { text: r.text } : { error: 'empty_content' })
      for (const e of data.errors ?? []) out.set(e.url, { error: e.error })
      return out
    },
  }
}

export interface OfficialRule {
  title: string
  text: string
  /** Applies to posts ('link'), comments ('comment') or both ('all'). */
  kind: 'all' | 'link' | 'comment'
}

export interface SubredditAbout {
  subscribers: number | null
  description: string | null
  type: string | null
  over18: boolean
}

const RULE_TEXT_MAX = 1500

/** The JSON inside the fetched text (the service wraps it in a code fence). */
function jsonFromText(text: string): unknown {
  const raw = text.trim().replace(/^```\w*\s*/, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(raw)
  }
  catch {
    return null
  }
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'')

export function parseRulesJson(text: string): OfficialRule[] | null {
  const data = jsonFromText(text) as { rules?: { short_name?: string, description?: string, kind?: string, priority?: number }[] } | null
  if (!data || !Array.isArray(data.rules)) return null
  return [...data.rules]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .filter(r => r.short_name)
    .map(r => ({
      title: decode(r.short_name!).trim(),
      text: decode(r.description ?? '').trim().slice(0, RULE_TEXT_MAX),
      kind: r.kind === 'link' || r.kind === 'comment' ? r.kind : 'all',
    }))
}

export function parseAboutJson(text: string): SubredditAbout | null {
  const data = jsonFromText(text) as { data?: { subscribers?: number, public_description?: string, subreddit_type?: string, over18?: boolean } } | null
  if (!data?.data) return null
  const d = data.data
  return {
    subscribers: typeof d.subscribers === 'number' ? d.subscribers : null,
    description: d.public_description ? decode(d.public_description).trim() || null : null,
    type: d.subreddit_type ?? null,
    over18: !!d.over18,
  }
}

export type OfficialRulesResult =
  | { status: 'ok', rules: OfficialRule[], about: SubredditAbout | null }
  /** Banned, private or doesn't exist. */
  | { status: 'missing' }
  | { status: 'failed', error: string }

/** Read one sub's official rules and about info (two URLs, one request). */
export async function readOfficialRules(pages: PageFetcher, subreddit: string): Promise<OfficialRulesResult> {
  const rulesUrl = `https://www.reddit.com/r/${subreddit}/about/rules.json`
  const aboutUrl = `https://www.reddit.com/r/${subreddit}/about.json`
  const res = await pages.fetch([rulesUrl, aboutUrl])
  const rules = res.get(rulesUrl)
  const about = res.get(aboutUrl)
  if (!rules || 'error' in rules) {
    const error = rules && 'error' in rules ? rules.error : 'no_result'
    return error === 'page_not_found' || error === 'login_required' ? { status: 'missing' } : { status: 'failed', error }
  }
  const parsed = parseRulesJson(rules.text)
  if (!parsed) return { status: 'failed', error: 'unparseable' }
  return { status: 'ok', rules: parsed, about: about && 'text' in about ? parseAboutJson(about.text) : null }
}
