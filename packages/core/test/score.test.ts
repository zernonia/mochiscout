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
    models: { fast: 'f', balanced: 'b', quality: 'q' },
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

describe('self-promotion', () => {
  it('caps a maker post the model scored high, but leaves others alone', async () => {
    const res = await scoreThreads(fakeLlm([
      { id: 1, intent: 70, kind: 'seeking_tool', reason: 'r', reply_angle: 'a' },
      { id: 2, intent: 70, kind: 'seeking_tool', reason: 'r', reply_angle: 'a' },
    ]), project, [
      { channel: 'studytips', title: 'classical w no lyrics is my go to for focus so i made a free ...', snippet: 'Any free alternatives to Brain.fm?' },
      { channel: 'studytips', title: 'Any free alternatives to Brain.fm?', snippet: null },
    ])
    expect(res.scores.map(s => [s?.intent, s?.kind])).toEqual([[25, 'other'], [70, 'seeking_tool']])
  })

  it('marks search snippets so other threads\' titles aren\'t read as the poster\'s words', () => {
    expect(scoringUserPrompt([{ channel: 'x', title: 'T', snippet: 'S', source: 'search' }])).toContain('[search snippet] S')
  })
})
