import { describe, expect, it } from 'vitest'
import { fitScore, normalizeSubredditName } from '../src/subreddits/map'

const none = { scored: 0, hits: 0, avgIntent: 0, pending: 0 }

describe('fitScore', () => {
  it('rewards evidence and intent density', () => {
    const weak = fitScore({ scored: 2, hits: 0, avgIntent: 20, pending: 0 }, null)
    const strong = fitScore({ scored: 20, hits: 12, avgIntent: 65, pending: 0 }, null)
    expect(strong).toBeGreaterThan(weak)
    expect(strong).toBeLessThanOrEqual(100)
  })
  it('weighs promo policy when rules are known', () => {
    const rules = (promo_policy: 'none' | 'allowed') => ({ promo_policy } as any)
    expect(fitScore(none, rules('allowed'))).toBeGreaterThan(fitScore(none, null))
    expect(fitScore(none, null)).toBeGreaterThan(fitScore(none, rules('none')))
  })
})

describe('normalizeSubredditName', () => {
  it.each([
    ['SaaS', 'saas'],
    ['r/SaaS', 'saas'],
    ['/r/startups/', 'startups'],
    ['https://www.reddit.com/r/SideProject/comments/abc', 'sideproject'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeSubredditName(input)).toBe(expected)
  })
  it.each(['', 'a', 'has space', 'way_too_long_subreddit_name_here'])('rejects %s', (input) => {
    expect(normalizeSubredditName(input)).toBeNull()
  })
})
