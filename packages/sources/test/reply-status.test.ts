import { describe, expect, it } from 'vitest'
import { createHttp } from '../src/http'
import { checkReplyStatus, parseReplyUrl } from '../src/reply-status'
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
