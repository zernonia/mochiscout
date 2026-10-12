import type { SearchClient, SourceAdapter } from '@mochiscout/sources'
import { describe, expect, it } from 'vitest'
import { findLeads, leadQueries, productTerms, rankFoundLeads } from '../src/leads/finder'

const item = (title: string, extra: Partial<{ url: string, snippet: string, source: 'reddit' | 'hn' }> = {}) => ({
  title, url: extra.url ?? `https://www.reddit.com/r/saas/comments/${title.length}/`, source: extra.source ?? 'reddit' as const, channel: 'saas', snippet: extra.snippet ?? '', postedAt: null,
})

describe('lead finder', () => {
  it('keeps the meaningful words of what they sell', () => {
    expect(productTerms('A changelog tool for SaaS apps')).toEqual(['changelog', 'saas'])
  })

  it('searches Reddit for recommendations, "looking for" and alternatives', () => {
    expect(leadQueries('changelog tool').map(q => q.query)).toEqual(['changelog tool recommendation', 'looking for changelog tool', 'changelog tool alternative'])
    expect(leadQueries('x')[0]).toMatchObject({ domains: ['reddit.com'] })
  })

  it('puts people asking for the product first and drops threads that don\'t mention it', () => {
    const ranked = rankFoundLeads('changelog tool', [
      item('We shipped our changelog'),
      item('Any recommendation for a changelog tool?', { url: 'https://www.reddit.com/r/saas/comments/a1/' }),
      item('Best pizza in town'),
      item('Any recommendation for a changelog tool?', { url: 'https://www.reddit.com/r/saas/comments/a1/' }),
    ])
    expect(ranked.map(r => [r.title, r.asking])).toEqual([['Any recommendation for a changelog tool?', true], ['We shipped our changelog', false]])
  })

  it('combines Reddit search and Hacker News, and survives a failing source', async () => {
    const search = { search: async () => ({ provider: 'tinyfish', cached: false, results: [
      { title: 'Looking for a changelog tool : r/SaaS', url: 'https://old.reddit.com/r/SaaS/comments/abc12/looking/', snippet: 'Need one', position: 1 },
      { title: 'Not a thread', url: 'https://www.reddit.com/r/SaaS/', snippet: '', position: 2 },
    ] }) } as unknown as SearchClient
    const hn = { search: async () => { throw new Error('down') } } as unknown as SourceAdapter
    const leads = await findLeads({ search, hn }, 'changelog tool', new Date('2026-10-12'))
    expect(leads).toEqual([expect.objectContaining({ title: 'Looking for a changelog tool', url: 'https://www.reddit.com/r/saas/comments/abc12/', channel: 'saas', asking: true })])
  })
})
