import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { newPostsFeedUrl, parseRedditFeed } from '../src/reddit/rss'
import { htmlToText, stripElements } from '../src/text'

const xml = readFileSync(new URL('./fixtures/multi.rss', import.meta.url), 'utf8')

describe('parseRedditFeed', () => {
  const posts = parseRedditFeed(xml)

  it('parses every post entry', () => {
    expect(posts.map(p => p.id)).toEqual(['reddit:t3_abc123', 'reddit:t3_def456'])
  })

  it('normalizes fields', () => {
    expect(posts[0]).toMatchObject({
      platform: 'reddit',
      channel: 'saas',
      title: 'Looking for an alternative to Foo & Bar',
      url: 'https://www.reddit.com/r/SaaS/comments/abc123/looking_for/',
      author: 'example_founder',
      createdAt: new Date('2026-10-08T10:43:35Z'),
    })
  })

  it('extracts the body as plain text without the submitted-by footer', () => {
    expect(posts[0]!.snippet).toBe('We\'re paying $200/mo for a tool & it still can\'t do X.\nAny alternatives?')
  })

  it('has no snippet for link posts', () => {
    expect(posts[1]!.snippet).toBeNull()
  })
})

describe('newPostsFeedUrl', () => {
  it('combines subreddits into one feed', () => {
    expect(newPostsFeedUrl(['SaaS', 'r/startups'])).toBe('https://www.reddit.com/r/saas+startups/new/.rss?limit=100')
  })
})

describe('stripElements', () => {
  it('removes whole elements, any case, with attributes', () => {
    expect(stripElements('a<script type="x">var b = "<svg";</script>c<STYLE>p{}</STYLE>d', ['script', 'style'])).toBe('a c d')
  })
  it('keeps tags that only share a prefix', () => {
    expect(stripElements('<navbar>keep</navbar><nav>drop</nav>', ['nav'])).toBe('<navbar>keep</navbar> ')
  })
  it('drops the rest of the page at an unclosed element instead of rescanning it', () => {
    expect(stripElements('intro<svg><path>…', ['svg'])).toBe('intro ')
  })
  it('stays fast on big pages full of tag names inside scripts', () => {
    const page = `<body>${'<script>var a="<svg";</script><div>x</div>'.repeat(20000)}</body>`
    const t = performance.now()
    expect(htmlToText(stripElements(page, ['svg', 'nav', 'script']))).toContain('x')
    expect(performance.now() - t).toBeLessThan(500)
  })
})
