import { describe, expect, it } from 'vitest'
import { normalizeBskyPost } from '../src/adapters/bluesky'
import { hnAdapter, normalizeHnHit } from '../src/adapters/hn'
import { createHttp } from '../src/http'

describe('normalizeHnHit', () => {
  it('normalizes stories', () => {
    expect(normalizeHnHit({ objectID: '42', title: 'Ask HN: Best CRM for a 3-person team?', story_text: '<p>We use <i>sheets</i> &amp; it hurts</p>', author: 'pg', created_at_i: 1_790_000_000, points: 12, num_comments: 7, _tags: ['story'] })).toEqual({
      id: 'hn:42',
      platform: 'hn',
      channel: null,
      title: 'Ask HN: Best CRM for a 3-person team?',
      url: 'https://news.ycombinator.com/item?id=42',
      author: 'pg',
      createdAt: new Date(1_790_000_000_000),
      snippet: 'We use sheets & it hurts',
      engagement: { points: 12, comments: 7 },
    })
  })
  it('titles comments after their story', () => {
    expect(normalizeHnHit({ objectID: '7', comment_text: 'Try X', story_title: 'CRMs in 2026', _tags: ['comment'] })?.title).toBe('Re: CRMs in 2026')
  })
})

describe('hnAdapter', () => {
  it('queries stories and comments since a date', async () => {
    let requested: URL | undefined
    const http = createHttp({
      userAgent: 't',
      minDelayMs: 0,
      fetch: async (url) => {
        requested = new URL(String(url))
        return new Response(JSON.stringify({ hits: [{ objectID: '1', title: 'T', _tags: ['story'] }] }))
      },
    })
    const posts = await hnAdapter(http).search('crm', new Date(1_790_000_000_000), 10)
    expect(posts.map(p => p.id)).toEqual(['hn:1'])
    expect(Object.fromEntries(requested!.searchParams)).toMatchObject({ query: 'crm', tags: '(story,comment)', numericFilters: 'created_at_i>1790000000', hitsPerPage: '10' })
  })
})

describe('normalizeBskyPost', () => {
  it('builds a web URL from the AT URI and uses the first line as title', () => {
    expect(normalizeBskyPost({
      uri: 'at://did:plc:abc/app.bsky.feed.post/3mxyz',
      author: { handle: 'maker.bsky.social' },
      record: { text: 'Looking for a CRM\nthat is not Salesforce', createdAt: '2026-10-08T10:00:00Z' },
      likeCount: 3,
      replyCount: 1,
    })).toMatchObject({
      id: 'bsky:at://did:plc:abc/app.bsky.feed.post/3mxyz',
      platform: 'bluesky',
      url: 'https://bsky.app/profile/maker.bsky.social/post/3mxyz',
      title: 'Looking for a CRM',
      snippet: 'Looking for a CRM\nthat is not Salesforce',
      author: 'maker.bsky.social',
      engagement: { likes: 3, replies: 1 },
    })
  })
  it('skips posts without text', () => {
    expect(normalizeBskyPost({ uri: 'at://x/app.bsky.feed.post/1', author: { handle: 'a' }, record: { text: '' } })).toBeNull()
  })
})
