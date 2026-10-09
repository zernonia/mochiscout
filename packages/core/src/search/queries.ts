import type { SearchQuery } from '@mochiscout/sources'

export interface DiscoveryProject {
  category: string | null
  keywords: string[]
  competitors: string[]
}

export type DiscoveryMode = 'new' | 'evergreen'

export interface DiscoveryQuery {
  mode: DiscoveryMode
  search: SearchQuery
}

const WEEK_MINUTES = 7 * 24 * 60
/** Per project per run (every 6 h). TinyFish allows 500 req/hour per key. */
export const MAX_QUERIES_PER_PROJECT = 16

// Purposes are per template, not per project, so cached results stay shareable.
const PURPOSE = {
  alternative: 'Find Reddit threads where people ask for alternatives to a product.',
  bestTool: 'Find Reddit threads where people ask which tool to use.',
  pain: 'Find Reddit threads where people describe frustrations with a problem.',
  keyword: 'Find Reddit threads where people discuss a problem or look for a solution.',
} as const

/**
 * Search templates from docs/arch.md §6. Each runs twice: "new" (last 7 days)
 * and "evergreen" (no freshness filter, i.e. threads already ranking).
 */
export function buildDiscoveryQueries(project: DiscoveryProject): DiscoveryQuery[] {
  const templates: { query: string, purpose: string }[] = []
  for (const competitor of project.competitors.slice(0, 3)) {
    templates.push({ query: `"${competitor}" alternative`, purpose: PURPOSE.alternative })
  }
  if (project.category) {
    templates.push({ query: `best ${project.category} tool`, purpose: PURPOSE.bestTool })
    templates.push({ query: `${project.category} "frustrated" OR "hate" OR "wish there was"`, purpose: PURPOSE.pain })
  }
  for (const keyword of project.keywords.slice(0, 3)) {
    templates.push({ query: keyword, purpose: PURPOSE.keyword })
  }

  const queries: DiscoveryQuery[] = []
  for (const t of templates) {
    const base = { query: t.query, purpose: t.purpose, domains: ['reddit.com'] }
    queries.push({ mode: 'new', search: { ...base, recencyMinutes: WEEK_MINUTES } })
    queries.push({ mode: 'evergreen', search: base })
  }
  return queries.slice(0, MAX_QUERIES_PER_PROJECT)
}
