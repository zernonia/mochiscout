import { describe, expect, it } from 'vitest'
import { alertWebhookKind, renderHotAlertWebhook } from '../src/leads/alerts'
import { evalMetrics, labelFor, precisionByBand } from '../src/scoring/quality'

describe('labelFor', () => {
  it('treats replies and saves as real leads, fit dismissals as misses, and ignores timing dismissals', () => {
    expect(labelFor('replied', null)).toBe('good')
    expect(labelFor('saved', null)).toBe('good')
    expect(labelFor('dismissed', 'not_buyer')).toBe('bad')
    expect(labelFor('dismissed', null)).toBe('bad')
    expect(labelFor('dismissed', 'closed')).toBeNull()
    expect(labelFor('dismissed', 'already_answered')).toBeNull()
    expect(labelFor('new', null)).toBeNull()
  })
})

describe('precisionByBand', () => {
  it('needs enough decisions before showing a figure', () => {
    const rows = [
      ...Array.from({ length: 4 }, () => ({ intent: 92, label: 'good' as const })),
      { intent: 95, label: 'bad' as const },
      { intent: 65, label: 'bad' as const },
    ]
    const [low, , high] = precisionByBand(rows)
    expect(high).toMatchObject({ good: 4, bad: 1, precision: 0.8 })
    expect(low).toMatchObject({ good: 0, bad: 1, precision: null })
  })
})

describe('evalMetrics', () => {
  it('computes precision and recall at a threshold', () => {
    const m = evalMetrics([
      { label: 'good', intent: 80 }, { label: 'good', intent: 50 },
      { label: 'bad', intent: 70 }, { label: 'bad', intent: 20 },
    ], 60)
    expect(m).toMatchObject({ truePositive: 1, falsePositive: 1, falseNegative: 1, trueNegative: 1, precision: 0.5, recall: 0.5, accuracy: 0.5 })
  })
})

describe('alert webhooks', () => {
  it('only accepts Slack and Discord webhook URLs', () => {
    expect(alertWebhookKind('https://hooks.slack.com/services/T0/B0/xyz')).toBe('slack')
    expect(alertWebhookKind('https://discord.com/api/webhooks/1/abc')).toBe('discord')
    expect(alertWebhookKind('http://hooks.slack.com/services/T0/B0/xyz')).toBeNull()
    expect(alertWebhookKind('https://evil.test/api/webhooks/1')).toBeNull()
    expect(alertWebhookKind('https://hooks.slack.com.evil.test/services/x')).toBeNull()
    expect(alertWebhookKind('not a url')).toBeNull()
  })
  it('formats leads for each chat app and escapes titles', () => {
    const lead = { title: 'Need <a> [tool]', url: 'https://reddit.com/r/saas/comments/1', channel: 'saas', platform: 'reddit', ageHours: 2, commentCount: 1, replyAngle: null, drafted: true }
    const slack = renderHotAlertWebhook('slack', 'https://app.test', { id: 'p1', name: 'Shipnote' }, [lead]) as { text: string }
    expect(slack.text).toContain('*1 hot lead for Shipnote*')
    expect(slack.text).toContain('<https://reddit.com/r/saas/comments/1|Need &lt;a&gt; [tool]>')
    expect(slack.text).toContain('<https://app.test/app/p1/inbox|Open your inbox →>')
    const discord = renderHotAlertWebhook('discord', 'https://app.test', { id: 'p1', name: 'Shipnote' }, [lead]) as { content: string, allowed_mentions: unknown }
    expect(discord.content).toContain('[Need <a> tool](<https://reddit.com/r/saas/comments/1>)')
    expect(discord.content).toContain('r/saas · 2h ago · 1 reply · reply drafted')
    expect(discord.allowed_mentions).toEqual({ parse: [] })
  })
})
