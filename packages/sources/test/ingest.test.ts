import { describe, expect, it } from 'vitest'
import { normalizeExtensionPost } from '../src/reddit/ingest'

describe('normalizeExtensionPost', () => {
  it('normalizes and rebuilds the URL from the id', () => {
    expect(normalizeExtensionPost({
      fullname: 't3_1AbC9',
      subreddit: 'r/SaaS',
      title: ' Need a CRM ',
      permalink: 'https://evil.example/phish',
      author: 'u/founder',
      createdAt: '2026-10-08T10:43:35.123000+0000',
      body: '<p>Spreadsheets &amp; pain</p>',
    })).toEqual({
      id: 'reddit:t3_1abc9',
      platform: 'reddit',
      channel: 'saas',
      title: 'Need a CRM',
      url: 'https://www.reddit.com/r/saas/comments/1abc9/',
      author: 'founder',
      createdAt: new Date('2026-10-08T10:43:35.123Z'),
      snippet: 'Spreadsheets & pain',
    })
  })
  it('rejects comments, bad subreddits and empty titles', () => {
    const base = { fullname: 't3_abc', subreddit: 'saas', title: 'T', permalink: '' }
    expect(normalizeExtensionPost({ ...base, fullname: 't1_abc' })).toBeNull()
    expect(normalizeExtensionPost({ ...base, subreddit: 'bad sub!' })).toBeNull()
    expect(normalizeExtensionPost({ ...base, title: '  ' })).toBeNull()
  })
})
