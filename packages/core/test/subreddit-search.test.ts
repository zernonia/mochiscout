import { describe, expect, it } from 'vitest'
import { matchScore, rankSubreddits } from '../src/subreddits/search'

describe('matchScore', () => {
  it('prefers exact, then prefix, then word, then substring, then fuzzy', () => {
    expect(matchScore('saas', 'SaaS')).toBe(100)
    expect(matchScore('prod', 'productivity')).toBeGreaterThan(matchScore('hunt', 'ProductHunt'))
    expect(matchScore('hunt', 'ProductHunt')).toBeGreaterThan(matchScore('duct', 'productivity'))
    expect(matchScore('prdctvty', 'productivity')).toBeGreaterThan(0)
    expect(matchScore('xyz', 'productivity')).toBe(0)
  })
})

describe('rankSubreddits', () => {
  it('ranks name matches by size, keeps Reddit\'s description matches last and merges duplicates', () => {
    const ranked = rankSubreddits('prod', [
      { name: 'hiphopheads', subscribers: 5_500_000, description: 'music' },
      { name: 'ProductivityApps', subscribers: 199_000, description: null },
      { name: 'productivity', subscribers: 4_257_475, description: 'Tips and tricks' },
      { name: 'productivity', subscribers: null, description: null, hasRules: true },
      { name: 'ProductManagement', subscribers: 283_741, description: null },
      { name: 'startups', subscribers: null, description: null, hasRules: true },
    ])
    expect(ranked.map(r => r.name)).toEqual(['productivity', 'ProductManagement', 'ProductivityApps', 'hiphopheads'])
    expect(ranked[0]).toMatchObject({ subscribers: 4_257_475, hasRules: true })
  })
})
