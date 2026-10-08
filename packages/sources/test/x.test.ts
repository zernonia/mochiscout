import { describe, expect, it } from 'vitest'
import { createHttp } from '../src/http'
import { normalizeXResponse, xAdapter } from '../src/adapters/x'

const response = {
  data: [
    { id: '111', text: 'Anyone know a CRM that is not Salesforce?\nTeam of 3', created_at: '2026-10-08T10:00:00.000Z', author_id: 'u1', public_metrics: { like_count: 2, reply_count: 5, repost_count: 0 } },
    { id: '222', text: 'orphan', author_id: 'missing' },
  ],
  includes: { users: [{ id: 'u1', username: 'founder' }] },
}

describe('normalizeXResponse', () => {
  it('joins authors and builds post URLs', () => {
    expect(normalizeXResponse(response)).toEqual([{
      id: 'x:111',
      platform: 'x',
      channel: null,
      title: 'Anyone know a CRM that is not Salesforce?',
      url: 'https://x.com/founder/status/111',
      author: 'founder',
      createdAt: new Date('2026-10-08T10:00:00Z'),
      snippet: 'Anyone know a CRM that is not Salesforce?\nTeam of 3',
      engagement: { likes: 2, replies: 5, reposts: 0 },
    }])
  })
})

describe('xAdapter', () => {
  it('sends the bearer token, excludes retweets and clamps the window to 7 days', async () => {
    let req: { url: URL, auth: string | null } | undefined
    const http = createHttp({
      userAgent: 't',
      minDelayMs: 0,
      fetch: async (url, init) => {
        req = { url: new URL(String(url)), auth: new Headers(init?.headers).get('authorization') }
        return new Response(JSON.stringify(response))
      },
    })
    const posts = await xAdapter(http, 'TOKEN').search('crm', new Date(0), 5)
    expect(posts).toHaveLength(1)
    expect(req!.auth).toBe('Bearer TOKEN')
    expect(req!.url.searchParams.get('query')).toBe('crm -is:retweet')
    expect(req!.url.searchParams.get('max_results')).toBe('10')
    expect(Date.now() - Date.parse(req!.url.searchParams.get('start_time')!)).toBeLessThan(7 * 86_400_000)
  })
})
