import type { Llm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { clusterPainPoints } from '../src/research/research'

const snippets = [1, 2, 3].map(i => ({
  threadId: `reddit:t3_${i}`,
  channel: i === 3 ? 'smallbusiness' : 'freelance',
  title: `Thread ${i}`,
  text: 'text',
  url: `https://www.reddit.com/r/x/comments/${i}/`,
}))

function llmReturning(pain_points: unknown[]): Llm {
  return {
    models: { fast: 'f', balanced: 'b', quality: 'q' },
    generate: async () => ({ data: { pain_points } as any, model: 'f', usage: { inputTokens: 1, outputTokens: 1 } }),
  }
}

describe('clusterPainPoints', () => {
  it('maps evidence numbers to threads, drops unknown numbers and empty clusters, clamps severity', async () => {
    const { points } = await clusterPainPoints(llmReturning([
      { title: 'Late payments', summary: 's', severity: 9, evidence: [{ n: 1, paraphrase: 'a' }, { n: 3, paraphrase: 'b' }, { n: 1, paraphrase: 'dup' }, { n: 42, paraphrase: 'bogus' }] },
      { title: 'Invented', summary: 's', severity: 2, evidence: [{ n: 99, paraphrase: 'x' }] },
    ]), { name: 'Acme', category: null, icp: null, problems: [] }, snippets)

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ title: 'Late payments', severity: 5, subreddits: ['freelance', 'smallbusiness'] })
    expect(points[0]!.evidence.map(e => e.threadId)).toEqual(['reddit:t3_1', 'reddit:t3_3'])
  })
})
