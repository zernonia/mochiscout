import type { Llm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { generateReply } from '../src/drafter/reply'
import { PLANS } from '../src/plans'

const project = { name: 'Shipnote', url: 'https://shipnote.test', category: 'changelog tool', icp: 'Small SaaS teams', problems: ['Users miss new features'] }

function capturingLlm() {
  const calls: { tier: string, system: string, prompt: string }[] = []
  const llm: Llm = {
    models: { fast: 'f', balanced: 'b', quality: 'q' },
    generate: async (opts: any) => {
      calls.push({ tier: opts.tier, system: opts.system, prompt: opts.prompt })
      return { data: { reply: 'Here is what worked for us…', mentions_product: false } as any, model: 'q', usage: { inputTokens: 1, outputTokens: 1 } }
    },
  }
  return { llm, calls }
}

const thread = { platform: 'reddit', channel: 'SaaS', title: 'Changelog tool that emails users?', snippet: 'Two-person team', kind: 'seeking_tool', reason: 'Asking for a tool', replyAngle: 'Share how you announce releases' }

describe('generateReply', () => {
  it('uses the default instructions with the product name, and puts the thread in the user turn', async () => {
    const { llm, calls } = capturingLlm()
    const res = await generateReply(llm, { project, thread, tier: 'balanced', effort: 'low' })
    expect(res.data.reply).toContain('worked for us')
    expect(calls[0]!.tier).toBe('balanced')
    expect(calls[0]!.system).toContain('honest disclosure ("I built Shipnote" or')
    expect(calls[0]!.system).toContain('Mention Shipnote only when')
    expect(calls[0]!.system).not.toContain('{product}')
    expect(calls[0]!.system).not.toContain('Two-person team')
    expect(calls[0]!.prompt).toContain('Thread in r/SaaS, the person is looking for a tool.')
    expect(calls[0]!.prompt).toContain('Suggested angle: Share how you announce releases')
  })

  it('follows the founder\'s own instructions, but the guardrails always apply', async () => {
    const { llm, calls } = capturingLlm()
    await generateReply(llm, {
      project: { ...project, replyInstructions: 'Keep it under 50 words. Always mention {product} when relevant.' },
      thread: { ...thread, platform: 'hn', channel: null, kind: 'pain' },
      tier: 'balanced',
    })
    expect(calls[0]!.system).toContain('Keep it under 50 words. Always mention Shipnote when relevant.')
    expect(calls[0]!.system).not.toContain('Mention Shipnote only when')
    expect(calls[0]!.system).toContain('Never invent facts')
    expect(calls[0]!.system).toContain('override the founder\'s instructions')
    expect(calls[0]!.prompt).toContain('Hacker News comment')
    expect(calls[0]!.prompt).toContain('the person is describing a problem')
  })

  it('caches the system prompt and trims long threads', async () => {
    const calls: any[] = []
    const llm: Llm = {
      models: { fast: 'f', balanced: 'b', quality: 'q' },
      generate: async (opts: any) => {
        calls.push(opts)
        return { data: { reply: 'ok', mentions_product: false } as any, model: 'b', usage: { inputTokens: 1, outputTokens: 1 } }
      },
    }
    const comments = Array.from({ length: 8 }, (_, i) => ({ author: `u${i}`, text: 'x'.repeat(600) }))
    await generateReply(llm, { project, thread: { ...thread, body: 'y'.repeat(5000), comments }, tier: 'balanced', effort: 'low' })
    expect(calls[0].cacheSystem).toBe(true)
    expect(calls[0].effort).toBe('low')
    expect(calls[0].prompt).toContain('Replies so far (top 5)')
    expect(calls[0].prompt).not.toContain('y'.repeat(3001))
    expect(calls[0].prompt).not.toContain('x'.repeat(401))
  })
})

describe('auto replies by plan', () => {
  it('is a paid feature (and on for self-host)', () => {
    expect(PLANS.free.autoReplies).toBe(false)
    expect(PLANS.solo.autoReplies).toBe(true)
    expect(PLANS.pro.autoReplies).toBe(true)
    expect(PLANS.selfhost.autoReplies).toBe(true)
  })
  it('caps AI drafts per month so model cost stays under the price', () => {
    expect([PLANS.free.draftsPerMonth, PLANS.solo.draftsPerMonth, PLANS.pro.draftsPerMonth]).toEqual([30, 300, 1500])
    expect(PLANS.selfhost.draftsPerMonth).toBe(Infinity)
  })
})
