import { describe, expect, it } from 'vitest'
import { buildDiscoveryQueries, MAX_QUERIES_PER_PROJECT } from '../src/search/queries'

describe('buildDiscoveryQueries', () => {
  const queries = buildDiscoveryQueries({
    category: 'crm',
    keywords: ['sales pipeline'],
    competitors: ['HubSpot'],
  })

  it('builds the arch templates in new and evergreen modes', () => {
    expect(queries.map(q => `${q.mode}: ${q.search.query}`)).toEqual([
      'new: "HubSpot" alternative',
      'evergreen: "HubSpot" alternative',
      'new: best crm tool',
      'evergreen: best crm tool',
      'new: crm "frustrated" OR "hate" OR "wish there was"',
      'evergreen: crm "frustrated" OR "hate" OR "wish there was"',
      'new: sales pipeline',
      'evergreen: sales pipeline',
    ])
  })

  it('restricts to reddit and only filters freshness for new', () => {
    expect(queries.every(q => q.search.domains?.[0] === 'reddit.com')).toBe(true)
    expect(queries.filter(q => q.search.recencyMinutes).every(q => q.mode === 'new')).toBe(true)
  })

  it('caps queries per project', () => {
    const many = buildDiscoveryQueries({
      category: 'x',
      keywords: ['a', 'b', 'c', 'd'],
      competitors: ['e', 'f', 'g', 'h'],
    })
    expect(many).toHaveLength(MAX_QUERIES_PER_PROJECT)
  })
})
