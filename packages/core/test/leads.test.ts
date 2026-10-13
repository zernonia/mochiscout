import type { Llm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { fillLink, generateReply, linksAllowed } from '../src/drafter/reply'
import { renderHotAlert } from '../src/leads/alerts'
import { assessLead, competitorMentions } from '../src/leads/assess'
import { scoringExamplesBrief } from '../src/leads/learning'
import { scoringSystemPrompt } from '../src/scoring/score'

const now = new Date('2026-10-09T12:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000)
const base = { id: 'reddit:t3_1abcdef', platform: 'reddit', intent: 85, state: 'open' as const, createdUtc: hoursAgo(3), engagement: null, comments: null, searchRankFlag: false }

describe('assessLead', () => {
  it('marks fresh, uncrowded, high-intent threads hot', () => {
    const lead = assessLead({ ...base, engagement: { comments: 2 } }, [], now)
    expect(lead).toMatchObject({ state: 'open', hot: true, ageHours: 3, commentCount: 2 })
    expect(lead.opportunity).toBe(88)
  })
  it('ranks stale and crowded threads lower, and not hot', () => {
    const fresh = assessLead(base, [], now)
    const stale = assessLead({ ...base, createdUtc: hoursAgo(100) }, [], now)
    const crowded = assessLead({ ...base, engagement: { comments: 60 } }, [], now)
    expect(stale.opportunity).toBeLessThan(fresh.opportunity)
    expect(crowded.opportunity).toBeLessThan(fresh.opportunity)
    expect(stale.hot || crowded.hot).toBe(false)
    expect(assessLead({ ...base, createdUtc: null }, [], now).hot).toBe(false)
  })
  it('scores closed threads 0, including old Reddit posts not yet checked', () => {
    expect(assessLead({ ...base, state: 'removed' }, [], now)).toMatchObject({ state: 'removed', opportunity: 0, hot: false })
    expect(assessLead({ ...base, createdUtc: new Date('2025-01-01') }, [], now)).toMatchObject({ state: 'archived', opportunity: 0 })
    expect(assessLead({ ...base, id: 'reddit:t3_abc123', createdUtc: null }, [], now).state).toBe('archived')
  })
  it('finds competitors already recommended in the replies', () => {
    const comments = [{ author: 'a', text: 'We moved to Acme last year' }, { author: 'b', text: 'acmeish is not it' }]
    expect(competitorMentions(comments, ['Acme (acme.com)', 'Zed'])).toEqual(['Acme'])
    expect(assessLead({ ...base, comments }, ['Acme'], now).competitorMentions).toEqual(['Acme'])
  })
})

describe('scoring calibration', () => {
  it('adds the founder\'s decisions to the scoring prompt', () => {
    const prompt = scoringSystemPrompt(
      { name: 'Shipnote', url: 'https://s.test', category: null, icp: null, problems: [], competitors: [] },
      { liked: [{ title: 'Changelog tool?', snippet: 'need one' }], disliked: [{ title: 'Hiring a PM', why: 'not their audience' }] },
    )
    expect(prompt).toContain('They replied to or saved:\n- "Changelog tool?" (need one)')
    expect(prompt).toContain('- "Hiring a PM" (not their audience)')
    expect(scoringExamplesBrief({ liked: [], disliked: [] })).toBe('')
  })
})

describe('generateReply with context', () => {
  it('uses the full post, existing replies and the founder\'s voice', async () => {
    let call: any
    const llm: Llm = {
      models: { fast: 'f', balanced: 'b', quality: 'q' },
      generate: async (opts: any) => {
        call = opts
        return { data: { reply: 'ok', mentions_product: false } as any, model: 'b', usage: { inputTokens: 1, outputTokens: 1 } }
      },
    }
    await generateReply(llm, {
      project: { name: 'Shipnote', url: 'https://s.test', category: null, icp: null, problems: [] },
      thread: { platform: 'reddit', channel: 'SaaS', title: 'Changelog tool?', snippet: 'SNIPPET-ONLY', body: 'The full post text', comments: [{ author: 'x', text: 'Try Acme' }], competitorMentions: ['Acme'], kind: 'seeking_tool', reason: null, replyAngle: null },
      tier: 'balanced',
      voice: ['honestly we just use a google doc lol'],
    })
    expect(call.tier).toBe('balanced')
    expect(call.prompt).toContain('The full post text')
    expect(call.prompt).not.toContain('SNIPPET-ONLY')
    expect(call.prompt).toContain('- x: Try Acme')
    expect(call.prompt).toContain('Competitors already mentioned in the replies: Acme')
    expect(call.system).toContain('<example>\nhonestly we just use a google doc lol\n</example>')
    expect(call.prompt).not.toContain('<direction>')
  })

  it('revises the current draft along the founder\'s direction, outside the cached system prompt', async () => {
    let call: any
    const llm: Llm = {
      models: { fast: 'f', balanced: 'b', quality: 'q' },
      generate: async (opts: any) => {
        call = opts
        return { data: { reply: 'ok', mentions_product: false } as any, model: 'b', usage: { inputTokens: 1, outputTokens: 1 } }
      },
    }
    await generateReply(llm, {
      project: { name: 'Shipnote', url: 'https://s.test', category: null, icp: null, problems: [] },
      thread: { platform: 'reddit', channel: 'SaaS', title: 'Changelog tool?', snippet: null, kind: 'seeking_tool', reason: null, replyAngle: 'Compare tools' },
      tier: 'balanced',
      direction: '  Keep it short and mention I built it for my own team  ',
      current: 'My edited draft',
    })
    expect(call.prompt).toContain('<direction>\nKeep it short and mention I built it for my own team\n</direction>')
    expect(call.prompt).toContain('<current_draft>\nMy edited draft\n</current_draft>')
    expect(call.system).not.toContain('mention I built it for my own team')
  })
})

describe('renderHotAlert', () => {
  it('lists leads with where, age and replies', () => {
    const email = renderHotAlert('https://app.test', { id: 'p1', name: 'Shipnote' }, [
      { title: 'Need a changelog <tool>', url: 'https://reddit.com/x', channel: 'saas', platform: 'reddit', ageHours: 2.4, commentCount: 1, replyAngle: 'Share your setup', drafted: true },
    ])
    expect(email.subject).toBe('Hot lead for Shipnote: Need a changelog <tool>')
    expect(email.html).toContain('Need a changelog &lt;tool&gt;')
    expect(email.text).toContain('r/saas · 2h ago · 1 reply · reply drafted')
    expect(email.text).toContain('https://app.test/app/p1/inbox')
  })
})

describe('reply links', () => {
  const rules = (links: 'none' | 'in_comments_only' | 'yes' | null, promo = 'allowed_with_value') => ({ links_allowed: links, promo_policy: promo }) as any

  it('allows a link on Reddit only where the sub allows links in comments and some promotion', () => {
    expect(linksAllowed('reddit', rules('yes'))).toBe(true)
    expect(linksAllowed('reddit', rules('in_comments_only'))).toBe(true)
    expect(linksAllowed('reddit', rules('none'))).toBe(false)
    expect(linksAllowed('reddit', rules('yes', 'none'))).toBe(false)
    expect(linksAllowed('reddit', rules(null))).toBe(false)
    expect(linksAllowed('reddit', null)).toBe(false)
    expect(linksAllowed('hn', null)).toBe(true)
    expect(linksAllowed('web', null)).toBe(false)
  })

  it('fills the tracked link once, or drops the placeholder cleanly', () => {
    expect(fillLink('I built Shipnote ({link}) for this.', 'https://s.test/?ref=ms_abc')).toBe('I built Shipnote (https://s.test/?ref=ms_abc) for this.')
    expect(fillLink('Try it: {link}. And {link}', 'https://s.test/?ref=ms_abc')).toBe('Try it: https://s.test/?ref=ms_abc. And ')
    expect(fillLink('I built Shipnote ({link}) for this.', null)).toBe('I built Shipnote for this.')
    expect(fillLink('No link here.', null)).toBe('No link here.')
  })
})

describe('generateReply prompt', () => {
  function capture() {
    const calls: any[] = []
    const llm: Llm = {
      models: { fast: 'f', balanced: 'b', quality: 'q' },
      generate: async (opts: any) => {
        calls.push(opts)
        return { data: { reply: 'ok', mentions_product: false } as any, model: 'b', usage: { inputTokens: 1, outputTokens: 1 } }
      },
    }
    return { llm, calls }
  }
  const thread = { platform: 'reddit', channel: 'SaaS', title: 'Changelog tool?', snippet: null, kind: 'seeking_tool', reason: null, replyAngle: null }

  it('gives the founder\'s facts in the cached system prompt and recent openings in the user turn', async () => {
    const { llm, calls } = capture()
    await generateReply(llm, {
      project: { name: 'Shipnote', url: 'https://s.test', category: null, icp: null, problems: [], replyFacts: 'Built it after our users missed 3 launches. $9/month.' },
      thread,
      tier: 'balanced',
      rules: { links_allowed: 'yes', promo_policy: 'allowed', post_formats: [] } as any,
      recent: ['The part that matters most is what you do after.'],
    })
    expect(calls[0].system).toContain('<founder_facts>\nBuilt it after our users missed 3 launches. $9/month.\n</founder_facts>')
    expect(calls[0].system).not.toContain('The part that matters most')
    expect(calls[0].prompt).toContain('- "The part that matters most is what you do after."')
    expect(calls[0].prompt).toContain('write {link} once')
  })

  it('forbids links where the community doesn\'t allow them', async () => {
    const { llm, calls } = capture()
    await generateReply(llm, {
      project: { name: 'Shipnote', url: 'https://s.test', category: null, icp: null, problems: [] },
      thread,
      tier: 'balanced',
      rules: { links_allowed: 'none', promo_policy: 'allowed', post_formats: [] } as any,
    })
    expect(calls[0].prompt).toContain('Links: not allowed here')
    expect(calls[0].system).not.toContain('<founder_facts>')
  })
})
