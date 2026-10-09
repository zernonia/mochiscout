import { describe, expect, it } from 'vitest'
import { fetchThreadContext, parseBskyThread, parseHnItem, parseRedditThread, stateFromAge } from '../src/context'
import { createHttp } from '../src/http'

const md = (text: string) => `&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${text}&lt;/p&gt;&lt;/div&gt;&lt;!-- SC_ON --&gt;`
const feed = (post: string, published = '2026-10-08T10:00:00+00:00') => `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><author><name>/u/asker</name></author><content type="html">${post}</content><id>t3_1abcdef</id><published>${published}</published><title>Need a tool</title></entry>
<entry><author><name>/u/helper</name></author><content type="html">${md('Try Acme, it does this')}</content><id>t1_c1</id></entry>
<entry><author><name>/u/mod</name></author><content type="html">${md('[removed]')}</content><id>t1_c2</id></entry>
</feed>`

const now = new Date('2026-10-09T12:00:00Z')

function httpReturning(status: number, body: string) {
  return createHttp({ userAgent: 't', minDelayMs: 0, fetch: async () => new Response(body, { status }) })
}

describe('stateFromAge', () => {
  it('flags old Reddit and HN threads as archived', () => {
    expect(stateFromAge('reddit', new Date('2026-03-01'), now)).toBe('archived')
    expect(stateFromAge('reddit', new Date('2026-09-01'), now)).toBeNull()
    expect(stateFromAge('hn', new Date('2026-09-20'), now)).toBe('archived')
    expect(stateFromAge('bluesky', new Date('2020-01-01'), now)).toBeNull()
  })
  it('knows 6-character Reddit ids are years old, even without a date', () => {
    expect(stateFromAge('reddit', null, now, 'reddit:t3_abc123')).toBe('archived')
    expect(stateFromAge('reddit', null, now, 'reddit:t3_1abcdef')).toBeNull()
  })
})

describe('parseRedditThread', () => {
  it('reads the post body, date and live comments', () => {
    const t = parseRedditThread(feed(md('We are 3 people &amp; hate invoicing')), '1abcdef')!
    expect(t.status).toBe('live')
    expect(t.body).toBe('We are 3 people & hate invoicing')
    expect(t.createdAt).toEqual(new Date('2026-10-08T10:00:00Z'))
    expect(t.comments).toEqual([{ author: 'helper', text: 'Try Acme, it does this' }])
    expect(t.commentCount).toBe(1)
  })
  it('has no body for link posts and detects removals', () => {
    expect(parseRedditThread(feed('submitted by /u/asker [link]'), '1abcdef')!.body).toBeNull()
    expect(parseRedditThread(feed(md('[removed]')), '1abcdef')!.status).toBe('removed')
  })
})

describe('fetchThreadContext', () => {
  const reddit = { id: 'reddit:t3_1abcdef', platform: 'reddit' as const, channel: 'saas', createdAt: null }

  it('marks a search-found Reddit thread archived once its date is known', async () => {
    const ctx = await fetchThreadContext(httpReturning(200, feed(md('old'), '2025-12-01T00:00:00Z')), reddit, now)
    expect(ctx?.state).toBe('archived')
    expect(ctx?.createdAt).toEqual(new Date('2025-12-01T00:00:00Z'))
  })
  it('treats a 404 as removed and skips the request for ancient ids', async () => {
    expect((await fetchThreadContext(httpReturning(404, ''), reddit, now))?.state).toBe('removed')
    const http = createHttp({ userAgent: 't', minDelayMs: 0, fetch: async () => { throw new Error('should not fetch') } })
    expect((await fetchThreadContext(http, { ...reddit, id: 'reddit:t3_abc12' }, now))?.state).toBe('archived')
  })
  it('reads HN items and closes them after two weeks', async () => {
    const item = { id: 1, created_at_i: Math.floor(now.getTime() / 1000) - 3600, author: 'pg', title: 'Ask HN: feedback tools?', text: '<p>We need one</p>', children: [{ id: 2, author: 'a', text: 'Use X', points: 3, children: [{ id: 3, author: 'b', text: 'agreed' }] }] }
    const ctx = await fetchThreadContext(httpReturning(200, JSON.stringify(item)), { id: 'hn:1', platform: 'hn', channel: null, createdAt: null }, now)
    expect(ctx).toMatchObject({ state: 'open', body: 'We need one', commentCount: 2, comments: [{ author: 'a', text: 'Use X', score: 3 }] })
    expect(parseHnItem({ ...item, created_at_i: 1 }).createdAt).toEqual(new Date(1000))
  })
  it('returns null for X (no free read API)', async () => {
    expect(await fetchThreadContext(httpReturning(200, ''), { id: 'x:1', platform: 'x', channel: null, createdAt: now }, now)).toBeNull()
  })
})

describe('parseBskyThread', () => {
  it('detects deleted posts and reply-gated threads', () => {
    expect(parseBskyThread({ $type: 'app.bsky.feed.defs#notFoundPost' }).state).toBe('deleted')
    const thread = {
      post: { record: { text: 'Any good booking tool?', createdAt: '2026-10-09T00:00:00Z' }, replyCount: 2, threadgate: { record: { allow: [] } } },
      replies: [{ post: { author: { handle: 'a' }, record: { text: 'cal.com' }, likeCount: 1 } }, { post: { author: { handle: 'b' }, record: { text: 'savvycal' }, likeCount: 5 } }],
    }
    const ctx = parseBskyThread(thread)
    expect(ctx.state).toBe('locked')
    expect(ctx.comments[0]).toEqual({ author: 'b', text: 'savvycal', score: 5 })
    expect(parseBskyThread({ ...thread, post: { ...thread.post, threadgate: undefined } }).state).toBe('open')
  })
})
