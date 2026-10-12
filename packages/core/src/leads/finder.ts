import type { Post, SearchClient, SearchQuery, SearchResult, SourceAdapter } from '@mochiscout/sources'
import { cleanRedditTitle, parseRedditThreadUrl } from '@mochiscout/sources'
import { INTENT_PHRASES, normalize } from '../scoring/prefilter'

/**
 * The free lead finder: recent Reddit and Hacker News threads where people
 * ask for, compare or complain about a kind of product. No LLM: a few
 * searches and a keyword ranking, so it is cheap enough to give away. The
 * product does the real thing (every 15 minutes, scored, with drafts).
 */

export interface FoundLead {
  title: string
  url: string
  source: 'reddit' | 'hn'
  /** Subreddit for Reddit threads. */
  channel: string | null
  snippet: string
  /** Asks for a tool, a recommendation or an alternative. */
  asking: boolean
  postedAt: string | null
  score: number
}

const RECENT_DAYS = 60
const MAX_RESULTS = 12
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'app', 'apps', 'tool', 'tools', 'software', 'platform', 'your', 'you', 'that', 'this', 'from', 'best', 'good', 'free', 'online'])

/** The words of what they sell that a matching thread should mention. */
export function productTerms(what: string): string[] {
  return [...new Set(normalize(what).trim().split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w)))].slice(0, 6)
}

/** Searches for threads asking for this kind of product. */
export function leadQueries(what: string): SearchQuery[] {
  const thing = what.trim().replace(/\s+/g, ' ').slice(0, 80)
  const base = { domains: ['reddit.com'], recencyMinutes: RECENT_DAYS * 24 * 60, limit: 20, purpose: `Find Reddit threads where people ask for, compare or look for alternatives to ${thing}` }
  return [
    { ...base, query: `${thing} recommendation` },
    { ...base, query: `looking for ${thing}` },
    { ...base, query: `${thing} alternative` },
  ]
}

const ASKING = INTENT_PHRASES.filter(p => !['vs', 'versus', 'hate', 'frustrated', 'struggling', 'how do you'].includes(p))

/** Rank threads by how well they match the product and whether they ask for something. */
export function rankFoundLeads(what: string, items: Omit<FoundLead, 'asking' | 'score'>[]): FoundLead[] {
  const terms = productTerms(what)
  const seen = new Set<string>()
  const out: FoundLead[] = []
  for (const item of items) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    const text = normalize(`${item.title} ${item.snippet}`)
    const title = normalize(item.title)
    const hits = terms.filter(t => text.includes(` ${t}`)).length
    if (terms.length && hits === 0) continue
    const asking = ASKING.some(p => text.includes(normalize(p))) || /\?\s*$/.test(item.title.trim())
    const titleHits = terms.filter(t => title.includes(` ${t}`)).length
    const score = hits * 2 + titleHits + (asking ? 4 : 0) + (item.source === 'reddit' ? 0.5 : 0)
    out.push({ ...item, asking, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
}

function fromSearch(results: SearchResult[]): Omit<FoundLead, 'asking' | 'score'>[] {
  return results.flatMap((r) => {
    const ref = parseRedditThreadUrl(r.url)
    if (!ref) return []
    return [{ title: cleanRedditTitle(r.title), url: ref.url, source: 'reddit' as const, channel: ref.subreddit, snippet: r.snippet.slice(0, 300), postedAt: null }]
  })
}

function fromHn(posts: Post[]): Omit<FoundLead, 'asking' | 'score'>[] {
  return posts.filter(p => p.title).map(p => ({
    title: p.title,
    url: p.url,
    source: 'hn' as const,
    channel: null,
    snippet: (p.snippet ?? '').slice(0, 300),
    postedAt: p.createdAt?.toISOString() ?? null,
  }))
}

/** Run the searches (failures are skipped) and rank what comes back. */
export async function findLeads(sources: { search?: SearchClient, hn?: SourceAdapter }, what: string, now: Date): Promise<FoundLead[]> {
  const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000)
  const settled = await Promise.allSettled([
    ...(sources.search ? leadQueries(what).map(q => sources.search!.search(q).then(r => fromSearch(r.results))) : []),
    ...(sources.hn ? [sources.hn.search(what, since, 30).then(fromHn)] : []),
  ])
  const items = settled.flatMap(s => (s.status === 'fulfilled' ? s.value : []))
  return rankFoundLeads(what, items)
}
