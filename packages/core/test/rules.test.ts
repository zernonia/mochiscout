import type { Llm } from '@mochiscout/llm'
import type { Http, PageFetcher } from '@mochiscout/sources'
import { describe, expect, it } from 'vitest'
import { readSubredditRules } from '../src/subreddits/rules'

const fence = (v: unknown) => `\`\`\`\n${JSON.stringify(v)}\n\`\`\``
const pages = (rules: unknown, about: unknown = { data: { display_name: 'SaaS' } }): PageFetcher => ({
  fetch: async urls => new Map(urls.map(u => [u, u.endsWith('rules.json') ? (rules === 404 ? { error: 'page_not_found' } : { text: fence(rules) }) : { text: fence(about) }])),
})
const http = { getText: async () => { throw new Error('403') } } as unknown as Http
const llm = (data: Record<string, unknown>, seen: string[] = []): Llm => ({
  generate: async (opts: { prompt: string }) => {
    seen.push(opts.prompt)
    return { data: { promo_policy: 'unknown', self_promo_thread: null, links_allowed: null, min_karma: null, min_account_age_days: null, cooldown_days: null, post_formats: [], tags: [], notes: '', ...data }, usage: { inputTokens: 10, outputTokens: 5 } }
  },
} as unknown as Llm)

describe('readSubredditRules', () => {
  it('builds a library record from the official rules, even when Reddit refuses the pinned posts', async () => {
    const prompts: string[] = []
    const res = await readSubredditRules(http, llm({ promo_policy: 'allowed_with_value', cooldown_days: 60, tags: ['SaaS', 'B2B Sales', ''], notes: 'Disclose affiliation.' }, prompts), pages({ rules: [{ short_name: 'No vendor spam', description: 'Max 1 mention every 60 days', kind: 'all' }] }), 'saas', '2026-10-12')
    expect(res.status).toBe('ok')
    if (res.status !== 'ok') return
    expect(res.rules).toMatchObject({
      name: 'SaaS', promo_policy: 'allowed_with_value', cooldown_days: 60, tags: ['saas', 'b2b-sales'], notes: 'Disclose affiliation.',
      last_verified: '2026-10-12', official: [{ title: 'No vendor spam', text: 'Max 1 mention every 60 days', kind: 'all' }], keep: [],
      source: 'https://www.reddit.com/r/saas/about/rules',
    })
    expect(prompts[0]).toContain('<official_rules>\n1. No vendor spam\nMax 1 mention every 60 days')
  })

  it('reads rules that never mention promotion as "allowed if valuable", and says so', async () => {
    const res = await readSubredditRules(http, llm({}), pages({ rules: [{ short_name: 'Be civil' }] }), 'saas', '2026-10-12')
    expect(res).toMatchObject({ status: 'ok', rules: { promo_policy: 'allowed_with_value', notes: 'The rules don\'t mention self-promotion.', tags: ['saas'] } })
  })

  it('skips subs that are gone, and fails loudly when the fetch fails', async () => {
    expect(await readSubredditRules(http, llm({}), pages(404), 'gone', '2026-10-12')).toEqual({ status: 'missing' })
    const broken: PageFetcher = { fetch: async urls => new Map(urls.map(u => [u, { error: 'timeout' }])) }
    await expect(readSubredditRules(http, llm({}), broken, 'saas', '2026-10-12')).rejects.toThrow('timeout')
  })
})
