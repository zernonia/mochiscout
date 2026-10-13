/**
 * Fuzzy subreddit search for the "watch a subreddit" box: "prod" finds
 * r/productivity and r/ProductManagement, "saas" finds r/SaaS and
 * r/SaaSMarketing, and a few typos still land.
 */

export interface SubredditOption {
  name: string
  subscribers: number | null
  description: string | null
  /** In the rules library or already read automatically. */
  hasRules?: boolean
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Characters of the query found in order in the name; gaps cost. Null when they aren't all there. */
function subsequenceScore(q: string, name: string): number | null {
  let pos = 0
  let gaps = 0
  for (const ch of q) {
    const at = name.indexOf(ch, pos)
    if (at < 0) return null
    if (at > pos) gaps++
    pos = at + 1
  }
  return Math.max(5, 30 - gaps * 5)
}

/** How well a name matches the query (0 = no match). */
export function matchScore(query: string, name: string): number {
  const q = key(query)
  const n = key(name)
  if (!q || !n) return 0
  if (n === q) return 100
  if (n.startsWith(q)) return 80
  // Word starts inside camel case names (r/ProductHunt for "hunt").
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/)
  if (words.some(w => w.startsWith(q))) return 70
  if (n.includes(q)) return 60
  return q.length >= 3 ? (subsequenceScore(q, n) ?? 0) : 0
}

/**
 * Merge local and Reddit's results and rank them: name match first, then
 * size. Reddit's own results that don't match the name (it searches
 * descriptions too) stay, below the name matches.
 */
export function rankSubreddits(query: string, options: SubredditOption[], limit = 8): SubredditOption[] {
  const byName = new Map<string, SubredditOption>()
  for (const o of options) {
    const k = o.name.toLowerCase()
    const prev = byName.get(k)
    byName.set(k, prev
      ? { name: /[A-Z]/.test(o.name) ? o.name : prev.name, subscribers: prev.subscribers ?? o.subscribers, description: prev.description ?? o.description, hasRules: prev.hasRules || o.hasRules }
      : o)
  }
  const size = (o: SubredditOption) => Math.log10((o.subscribers ?? 0) + 10)
  return [...byName.values()]
    .map(o => ({ o, score: matchScore(query, o.name) }))
    .filter(x => x.score > 0 || x.o.subscribers !== null)
    .sort((a, b) => (b.score + size(b.o) * 3) - (a.score + size(a.o) * 3))
    .slice(0, limit)
    .map(x => x.o)
}
