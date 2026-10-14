import type { Llm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { generateFollowUp } from '../src/drafter/follow-up'

function fake() {
  const calls: { system: string, prompt: string }[] = []
  const llm: Llm = {
    models: { fast: 'f', balanced: 'b', quality: 'q' },
    generate: async (opts: any) => {
      calls.push({ system: opts.system, prompt: opts.prompt })
      return { data: { reply: 'Yes, up to five people.', mentions_product: false } as any, model: 'b', usage: { inputTokens: 1, outputTokens: 1 } }
    },
  }
  return { llm, calls }
}

const project = { name: 'Shipnote', url: 'https://shipnote.app', category: 'changelog tool', icp: 'Small SaaS teams', problems: ['Nobody reads release notes'], replyFacts: 'Free for teams under 5.' }

describe('generateFollowUp', () => {
  it('puts both sides of the conversation in the prompt and keeps the guardrails', async () => {
    const { llm, calls } = fake()
    await generateFollowUp(llm, {
      project,
      thread: { platform: 'reddit', channel: 'SaaS', title: 'Changelog tool?' },
      ownReply: 'I built Shipnote for this.',
      response: { author: 'curious', text: 'Does it handle teams?' },
      tier: 'balanced',
      rules: null,
    })
    const { system, prompt } = calls[0]!
    expect(system).toContain('Never invent facts')
    expect(system).toContain('Free for teams under 5.')
    expect(prompt).toContain('<founder_comment>\nI built Shipnote for this.')
    expect(prompt).toContain('curious replied:')
    expect(prompt).toContain('Does it handle teams?')
  })
  it('allows a link only where links are allowed', async () => {
    const { llm, calls } = fake()
    const base = { project, ownReply: 'x', response: { author: null, text: 'link?' }, tier: 'balanced' as const }
    await generateFollowUp(llm, { ...base, thread: { platform: 'hn', channel: null, title: 't' } })
    await generateFollowUp(llm, { ...base, thread: { platform: 'reddit', channel: 'SaaS', title: 't' }, rules: { name: 'SaaS', promo_policy: 'allowed_with_value', self_promo_thread: null, min_karma: null, min_account_age_days: null, links_allowed: 'none', post_formats: [], cooldown_days: null, tags: [], notes: '', last_verified: '2026-10-01', official: [], keep: [], source: 'https://www.reddit.com/r/SaaS/about/rules' } })
    expect(calls[0]!.prompt).toContain('{link}')
    expect(calls[1]!.prompt).toContain('Links: not allowed here.')
  })
})
