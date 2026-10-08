import type { SubredditRules } from './schema'
import data from '../rules.json'

export * from './schema'

const byName = new Map((data as SubredditRules[]).map(r => [r.name.toLowerCase(), r]))

/** Rules version: bumps whenever rules.json is rebuilt with changes. */
export const RULES_VERSION: string = (data as SubredditRules[]).reduce((v, r) => (r.last_verified > v ? r.last_verified : v), '')

export function getRules(subreddit: string): SubredditRules | undefined {
  return byName.get(subreddit.toLowerCase())
}

export function allRules(): SubredditRules[] {
  return [...byName.values()]
}

/** Subreddits whose tags overlap the given terms. */
export function rulesForTags(terms: string[]): SubredditRules[] {
  const wanted = new Set(terms.flatMap(t => t.toLowerCase().split(/[^a-z0-9]+/)).filter(t => t.length >= 3))
  return allRules().filter(r => r.tags.some(tag => tag.split('-').some(part => wanted.has(part))))
}
