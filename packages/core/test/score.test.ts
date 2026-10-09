import type { Llm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { scoreThreads, scoringUserPrompt } from '../src/scoring/score'

const project = { name: 'Acme', url: 'https://acme.test', category: 'crm', icp: null, problems: [], competitors: [] }
const threads = [
  { channel: 'sales', title: 'Need a CRM', snippet: 'tiny team' },
  { channel: null, title: 'Unrelated', snippet: null },
  { channel: 'sales', title: 'Third', snippet: null },
]

function fakeLlm(scores: unknown[]): Llm {
  return {
    models: { fast: 'f', quality: 'q' },
    generate: async () => ({ data: { scores } as any, model: 'f', usage: { inputTokens: 1, outputTokens: 1 } }),
  }
}

describe('scoringUserPrompt', () => {
  it('numbers threads from 1', () => {
    expect(scoringUserPrompt(threads)).toContain('<thread id="1">\nr/sales · Need a CRM\ntiny team\n</thread>')
    expect(scoringUserPrompt(threads)).toContain('<thread id="2">\nUnrelated')
  })
})

describe('scoreThreads', () => {
  it('maps scores back by number, clamps intent and ignores unknown or duplicate ids', async () => {
    const res = await scoreThreads(fakeLlm([
      { id: 2, intent: 5, kind: 'other', reason: 'r', reply_angle: 'a' },
      { id: 1, intent: 140, kind: 'seeking_tool', reason: 'r', reply_angle: 'a' },
      { id: 1, intent: 10, kind: 'other', reason: 'dup', reply_angle: 'a' },
      { id: 9, intent: 50, kind: 'other', reason: 'bogus', reply_angle: 'a' },
    ]), project, threads)
    expect(res.scores.map(s => s?.intent ?? null)).toEqual([100, 5, null])
  })
})
