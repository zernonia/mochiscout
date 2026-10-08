import { describe, expect, it } from 'vitest'
import { projectTerms, termsForRun } from '../src/jobs/feeds'
import { scoringUserPrompt } from '../src/scoring/score'

describe('termsForRun', () => {
  const terms = Array.from({ length: 14 }, (_, i) => `t${i}`)
  it('rotates through all terms across runs', () => {
    const seen = new Set([0, 1, 2].flatMap(run => termsForRun(terms, run)))
    expect(seen.size).toBe(14)
    expect(termsForRun(terms, 0)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5'])
    expect(termsForRun(terms, 2)).toEqual(['t12', 't13', 't0', 't1', 't2', 't3'])
  })
  it('returns all terms when there are few', () => {
    expect(termsForRun(['a', 'b'], 99)).toEqual(['a', 'b'])
  })
})

describe('projectTerms', () => {
  it('falls back to keywords and competitors and de-duplicates', () => {
    expect(projectTerms({ searchTerms: [], keywords: ['crm', ' crm '], competitors: ['HubSpot'] })).toEqual(['crm', 'HubSpot'])
    expect(projectTerms({ searchTerms: ['need a crm'], keywords: ['crm'], competitors: [] })).toEqual(['need a crm'])
  })
})

describe('scoring prompt labels', () => {
  it('labels each platform', () => {
    const prompt = scoringUserPrompt([
      { platform: 'hn', channel: null, title: 'Ask HN', snippet: null },
      { platform: 'bluesky', channel: null, title: 'Post', snippet: null },
      { platform: 'reddit', channel: 'saas', title: 'Thread', snippet: null },
    ])
    expect(prompt).toContain('Hacker News · Ask HN')
    expect(prompt).toContain('Bluesky · Post')
    expect(prompt).toContain('r/saas · Thread')
  })
})
