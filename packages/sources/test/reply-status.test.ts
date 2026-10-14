import { describe, expect, it } from 'vitest'
import { createHttp } from '../src/http'
import { checkReplyStatus, parseReplyUrl, readReplyThread } from '../src/reply-status'
import { parseFeedSubtitle } from '../src/reddit/rss'

const http = (status: number, body: string) => createHttp({ userAgent: 't', minDelayMs: 0, fetch: async () => new Response(body, { status }) })
const md = (t: string) => `&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${t}&lt;/p&gt;&lt;/div&gt;&lt;!-- SC_ON --&gt;`
const feed = (text: string) => `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>t3_1abc</id><content type="html">x</content></entry><entry><id>t1_def9</id><content type="html">${md(text)}</content></entry></feed>`

describe('parseReplyUrl', () => {
  it('recognizes reply links on each platform', () => {
    expect(parseReplyUrl('https://www.reddit.com/r/SaaS/comments/1abc/some_title/def9/')).toMatchObject({ platform: 'reddit', id: 't1_def9', checkUrl: 'https://www.reddit.com/r/SaaS/comments/1abc/_/def9/.rss' })
    expect(parseReplyUrl('https://news.ycombinator.com/item?id=4242')).toMatchObject({ platform: 'hn', id: '4242' })
    expect(parseReplyUrl('https://bsky.app/profile/me.bsky.social/post/3kxyz')?.id).toBe('at://me.bsky.social/app.bsky.feed.post/3kxyz')
    expect(parseReplyUrl('https://x.com/me/status/123')).toMatchObject({ platform: 'x', checkUrl: null })
  })
  it('rejects post links and other sites', () => {
    expect(parseReplyUrl('https://www.reddit.com/r/SaaS/comments/1abc/some_title/')).toBeNull()
    expect(parseReplyUrl('https://example.com')).toBeNull()
    expect(parseReplyUrl('not a url')).toBeNull()
  })
})

describe('checkReplyStatus', () => {
  const ref = parseReplyUrl('https://www.reddit.com/r/SaaS/comments/1abc/t/def9/')!
  it('reads live and removed Reddit comments', async () => {
    expect(await checkReplyStatus(http(200, feed('Great question')), ref)).toBe('live')
    expect(await checkReplyStatus(http(200, feed('[removed]')), ref)).toBe('removed')
    expect(await checkReplyStatus(http(404, ''), ref)).toBe('removed')
  })
  it('reads HN items and leaves X unknown', async () => {
    expect(await checkReplyStatus(http(200, JSON.stringify({ author: 'me', text: 'hi' })), parseReplyUrl('https://news.ycombinator.com/item?id=1')!)).toBe('live')
    expect(await checkReplyStatus(http(200, JSON.stringify({ author: null, text: null })), parseReplyUrl('https://news.ycombinator.com/item?id=1')!)).toBe('removed')
    expect(await checkReplyStatus(http(200, ''), parseReplyUrl('https://x.com/me/status/1')!)).toBe('unknown')
  })
})

describe('parseFeedSubtitle', () => {
  it('reads the subreddit description', () => {
    expect(parseFeedSubtitle('<feed xmlns="http://www.w3.org/2005/Atom"><subtitle>Software as a Service &amp; more</subtitle></feed>')).toBe('Software as a Service & more')
    expect(parseFeedSubtitle('<feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toBeNull()
  })
})

describe('parseReplyUrl hardening', () => {
  it('rejects non-http schemes and stores a rebuilt link', () => {
    expect(parseReplyUrl('javascript://news.ycombinator.com/%0Aalert(1)//?id=1')).toBeNull()
    expect(parseReplyUrl('https://news.ycombinator.com/user?id=1')).toBeNull()
    expect(parseReplyUrl('https://x.com/me/status/123?s=20')).toMatchObject({ url: 'https://x.com/me/status/123' })
    expect(parseReplyUrl('https://x.com/me/status/123/photo/1')).toBeNull()
    expect(parseReplyUrl('https://old.reddit.com/r/SaaS/comments/1abc/some_title/def9/?utm=x')).toMatchObject({ url: 'https://www.reddit.com/r/SaaS/comments/1abc/_/def9/' })
    expect(parseReplyUrl('https://news.ycombinator.com/item?id=4242&x=<b>')).toMatchObject({ url: 'https://news.ycombinator.com/item?id=4242' })
  })
})

describe('readReplyThread', () => {
  const entry = (id: string, author: string, text: string, comment = id.replace('t1_', '')) =>
    `<entry><author><name>/u/${author}</name></author><content type="html">${md(text)}</content><id>${id}</id><link href="https://www.reddit.com/r/SaaS/comments/1abc/some_title/${comment}/" /><published>2026-10-14T05:00:00+00:00</published></entry>`
  const redditFeed = (...entries: string[]) => `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>t3_1abc</id><author><name>/u/op</name></author><content type="html">post</content></entry>${entries.join('')}</feed>`
  const ref = parseReplyUrl('https://www.reddit.com/r/SaaS/comments/1abc/t/def9/')!

  it('lists everyone who answered under a Reddit reply, except the founder', async () => {
    const body = redditFeed(
      entry('t1_def9', 'founder', 'I built a tool for this'),
      entry('t1_aaa1', 'curious', 'Does it handle teams?'),
      entry('t1_aaa2', 'founder', 'Yes, up to five'),
      entry('t1_aaa3', 'other', '[removed]'),
      entry('t1_aaa4', 'other', 'Following'),
    )
    const r = await readReplyThread(http(200, body), ref)
    expect(r.status).toBe('live')
    expect(r.text).toBe('I built a tool for this')
    expect(r.responses.map(x => [x.id, x.author, x.text])).toEqual([['t1_aaa1', 'curious', 'Does it handle teams?'], ['t1_aaa4', 'other', 'Following']])
    expect(r.responses[0]!.url).toBe('https://www.reddit.com/r/SaaS/comments/1abc/_/aaa1/')
    expect(r.responses[0]!.createdAt?.toISOString()).toBe('2026-10-14T05:00:00.000Z')
  })
  it('reports a removed Reddit reply with no responses', async () => {
    expect(await readReplyThread(http(200, redditFeed(entry('t1_def9', 'founder', '[removed]'), entry('t1_aaa1', 'x', 'hi'))), ref)).toEqual({ status: 'removed', text: null, responses: [] })
    expect((await readReplyThread(http(200, redditFeed()), ref)).status).toBe('removed')
  })
  it('walks nested Hacker News children', async () => {
    const item = { id: 1, author: 'me', text: '<p>My answer</p>', children: [
      { id: 2, author: 'pg', text: 'Interesting', created_at: '2026-10-14T06:00:00Z', children: [{ id: 3, author: 'me', text: 'Thanks', children: [] }, { id: 4, author: 'dang', text: 'Agreed', created_at: '2026-10-14T07:00:00Z' }] },
      { id: 5, author: null, text: null },
    ] }
    const r = await readReplyThread(http(200, JSON.stringify(item)), parseReplyUrl('https://news.ycombinator.com/item?id=1')!)
    expect(r.text).toBe('My answer')
    expect(r.responses.map(x => [x.id, x.author, x.url])).toEqual([['2', 'pg', 'https://news.ycombinator.com/item?id=2'], ['4', 'dang', 'https://news.ycombinator.com/item?id=4']])
  })
  it('reads Bluesky replies and rebuilds their links', async () => {
    const post = (handle: string, rkey: string, text: string, replies: unknown[] = []) => ({ post: { uri: `at://did:plc:${handle}/app.bsky.feed.post/${rkey}`, author: { handle }, record: { text, createdAt: '2026-10-14T05:00:00Z' } }, replies })
    const thread = post('me.bsky.social', '3kroot', 'My reply', [post('ann.bsky.social', '3kaaa', 'Nice', [post('me.bsky.social', '3kbbb', 'Thanks')])])
    const r = await readReplyThread(http(200, JSON.stringify({ thread })), parseReplyUrl('https://bsky.app/profile/me.bsky.social/post/3kroot')!)
    expect(r.responses).toHaveLength(1)
    expect(r.responses[0]).toMatchObject({ author: 'ann.bsky.social', text: 'Nice', url: 'https://bsky.app/profile/ann.bsky.social/post/3kaaa' })
  })
  it('leaves X unread', async () => {
    expect(await readReplyThread(http(200, ''), parseReplyUrl('https://x.com/me/status/1')!)).toEqual({ status: 'unknown', text: null, responses: [] })
  })
})
