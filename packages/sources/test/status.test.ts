import { describe, expect, it } from 'vitest'
import { parsePostStatus, postFeedUrl, userFeedUrl } from '../src/reddit/status'

const feed = (content: string, author = '/u/maker') => `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><author><name>${author}</name></author><content type="html">${content}</content><id>t3_abc12</id>
<link href="https://www.reddit.com/r/SaaS/comments/abc12/x/" /><published>2026-10-08T10:00:00+00:00</published><title>My post &amp; more</title></entry>
<entry><author><name>/u/other</name></author><content type="html">&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;[removed]&lt;/p&gt;&lt;/div&gt;&lt;!-- SC_ON --&gt;</content><id>t1_c1</id></entry>
</feed>`
const body = (text: string) => `&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${text}&lt;/p&gt; &lt;/div&gt;&lt;!-- SC_ON --&gt; submitted by`

describe('parsePostStatus', () => {
  it('reads a live post', () => {
    expect(parsePostStatus(feed(body('[removed] is just a word here')), 'abc12')?.status).toBe('live')
    expect(parsePostStatus(feed(body('Hello there')), 'abc12')).toEqual({
      status: 'live',
      title: 'My post & more',
      author: 'maker',
      publishedAt: new Date('2026-10-08T10:00:00Z'),
    })
  })
  it('detects removed and deleted posts', () => {
    expect(parsePostStatus(feed(body('[removed]')), 't3_abc12')?.status).toBe('removed')
    expect(parsePostStatus(feed(body('[deleted]')), 'abc12')?.status).toBe('deleted')
    expect(parsePostStatus(feed(body('text'), '/u/[deleted]'), 'abc12')?.status).toBe('deleted')
  })
  it('ignores comments and returns null when the post is missing', () => {
    expect(parsePostStatus(feed(body('x')), 'zzz')).toBeNull()
  })
})

describe('feed URLs', () => {
  it('builds post and user feed URLs', () => {
    expect(postFeedUrl('SaaS', 't3_abc12')).toBe('https://www.reddit.com/r/saas/comments/abc12/.rss')
    expect(userFeedUrl('maker')).toBe('https://www.reddit.com/user/maker/.rss')
  })
})
