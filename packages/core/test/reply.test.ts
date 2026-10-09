import type { Llm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { generateReply } from '../src/drafter/reply'
import { PLANS } from '../src/plans'

const project = { name: 'Shipnote', url: 'https://shipnote.test', category: 'changelog tool', icp: 'Small SaaS teams', problems: ['Users miss new features'] }

function capturingLlm() {
  const calls: { tier: string, system: string, prompt: string }[] = []
  const llm: Llm = {
    models: { fast: 'f', quality: 'q' },
    generate: async (opts: any) => {
      calls.push({ tier: opts.tier, system: opts.system, prompt: opts.prompt })
      return { data: { reply: 'Here is what worked for us…', mentions_product: false } as any, model: 'q', usage: { inputTokens: 1, outputTokens: 1 } }
    },
  }
  return { llm, calls }
}

const thread = { platform: 'reddit', channel: 'SaaS', title: 'Changelog tool that emails users?', snippet: 'Two-person team', kind: 'seeking_tool', reason: 'Asking for a tool', replyAngle: 'Share how you announce releases' }

describe('generateReply', () => {
  it('allows a disclosed mention when the person asks for a tool', async () => {
    const { llm, calls } = capturingLlm()
    const res = await generateReply(llm, { project, thread, tier: 'quality' })
    expect(res.data.reply).toContain('worked for us')
    expect(calls[0]!.tier).toBe('quality')
    expect(calls[0]!.system).toContain('honest disclosure ("I built Shipnote"')
    expect(calls[0]!.prompt).toContain('Thread in r/SaaS:')
    expect(calls[0]!.prompt).toContain('Suggested angle: Share how you announce releases')
  })

  it('steers away from the product when nobody asked for a tool, and uses the platform style', async () => {
    const { llm, calls } = capturingLlm()
    await generateReply(llm, { project, thread: { ...thread, platform: 'hn', channel: null, kind: 'pain' }, tier: 'fast' })
    expect(calls[0]!.system).toContain('Do not mention Shipnote unless')
    expect(calls[0]!.system).toContain('Hacker News comment')
    expect(calls[0]!.prompt).toContain('Thread on hn:')
  })
})

describe('auto replies by plan', () => {
  it('is a paid feature (and on for self-host)', () => {
    expect(PLANS.free.autoReplies).toBe(false)
    expect(PLANS.solo.autoReplies).toBe(true)
    expect(PLANS.pro.autoReplies).toBe(true)
    expect(PLANS.selfhost.autoReplies).toBe(true)
  })
})
