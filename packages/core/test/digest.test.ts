import { describe, expect, it } from 'vitest'
import { localHour, renderDigest } from '../src/today/digest'

describe('localHour', () => {
  const now = new Date('2026-10-08T23:30:00Z')
  it('converts to the user time zone', () => {
    expect(localHour(now, 'UTC')).toBe(23)
    expect(localHour(now, 'Asia/Kuala_Lumpur')).toBe(7)
    expect(localHour(now, 'America/Los_Angeles')).toBe(16)
  })
  it('falls back to UTC for unknown zones', () => {
    expect(localHour(now, 'Not/AZone')).toBe(23)
  })
})

describe('renderDigest', () => {
  it('escapes content and links to today and settings', () => {
    const { html, text } = renderDigest('https://app.test', [{
      project: { id: 'p1', name: 'Acme <script>' },
      plan: {
        threads: [{ id: 't', platform: 'reddit', channel: 'saas', title: 'Need a <b>CRM</b>', url: 'https://www.reddit.com/r/saas/comments/t/', snippet: null, createdUtc: null, intent: 88, kind: 'seeking_tool', reason: null, replyAngle: 'Share your setup' }],
        newCount: 3,
        pendingScoring: 0,
        suggestion: { subreddit: 'saas', angle: 'story', promo: true, topic: 'Pricing', why: 'Fits best.' },
        pacing: { promoToday: 0, promoLimit: 1, nextPromoAt: null, cooldowns: [] },
      },
    }])
    expect(html).toContain('Acme &lt;script&gt;')
    expect(html).toContain('Need a &lt;b&gt;CRM&lt;/b&gt;')
    expect(html).toContain('https://app.test/app/p1/today')
    expect(text).toContain('Post idea: a story about "Pricing" in r/saas.')
    expect(text).toContain('https://app.test/app/settings')
  })
})
