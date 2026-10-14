import { describe, expect, it } from 'vitest'
import { renderResponseAlert, renderResponseWebhook } from '../src/leads/reply-watch'

const project = { id: 'p1', name: 'Shipnote' }
const item = { author: 'curious', text: 'Does it <script>alert(1)</script> handle teams?', url: 'https://www.reddit.com/r/SaaS/comments/1abc/_/aaa1/', threadTitle: 'Changelog tool?', where: 'r/SaaS' }

describe('response alerts', () => {
  it('escapes what people wrote and names who replied', () => {
    const email = renderResponseAlert('https://mochiscout.com', project, [item])
    expect(email.subject).toBe('curious replied to you in r/SaaS')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).toContain('https://mochiscout.com/app/p1/today')
    expect(renderResponseAlert('https://mochiscout.com', project, [item, { ...item, author: null }]).subject).toBe('2 new replies to your comments')
  })
  it('formats Slack and Discord messages without mentions', () => {
    const slack = renderResponseWebhook('slack', 'https://mochiscout.com', project, [item]) as { text: string }
    expect(slack.text).toContain('&lt;script&gt;')
    const discord = renderResponseWebhook('discord', 'https://mochiscout.com', project, [item]) as { content: string, allowed_mentions: unknown }
    expect(discord.allowed_mentions).toEqual({ parse: [] })
    expect(discord.content).toContain('(<https://www.reddit.com/r/SaaS/comments/1abc/_/aaa1/>)')
  })
})
