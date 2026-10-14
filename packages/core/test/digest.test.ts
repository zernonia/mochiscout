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
        threads: [{ id: 't', platform: 'reddit', channel: 'saas', title: 'Need a <b>CRM</b>', url: 'https://www.reddit.com/r/saas/comments/t/', snippet: null, createdUtc: null, intent: 88, kind: 'seeking_tool', reason: null, replyAngle: 'Share your setup', author: null, alsoAsking: [], openToDms: false }],
        newCount: 3,
        trend: [],
        pendingScoring: 0,
        suggestion: { subreddit: 'saas', angle: 'story', promo: true, topic: 'Pricing', why: 'Fits best.', timing: null },
        pacing: { promoToday: 0, promoLimit: 1, nextPromoAt: null, cooldowns: [] },
      },
    }])
    expect(html).toContain('Acme &lt;script&gt;')
    expect(html).toContain('Need a &lt;b&gt;CRM&lt;/b&gt;')
    expect(html).toContain('https://app.test/app/p1/today')
    expect(text).toContain('Post idea: a story about "Pricing" in r/saas.')
    expect(text).toContain('https://app.test/app/settings')
  })

  it('adds the weekly summary on Mondays', () => {
    const plan = { threads: [], newCount: 0, trend: [], pendingScoring: 0, suggestion: null, pacing: { promoToday: 0, promoLimit: 1, nextPromoAt: null, cooldowns: [] } }
    const { subject, text } = renderDigest('https://app.test', [{
      project: { id: 'p1', name: 'Acme' },
      plan,
      week: { scored: 40, worthAnswering: 9, replied: 4, posts: 2, removed: 1, painPoints: [{ title: 'Late invoices', severity: 5 }] },
    }])
    expect(subject).toContain('week')
    expect(text).toContain('This week: 9 of 40 matching threads were worth answering; you replied to 4. 2 posts tracked, 1 removed or hidden.')
    expect(text).toContain('Top pain points: Late invoices')
  })
})
