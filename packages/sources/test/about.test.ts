import { describe, expect, it } from 'vitest'
import { parseAboutJson, parseRulesJson, readOfficialRules, tinyfishFetcher } from '../src/reddit/about'

const fence = (v: unknown) => `\`\`\`\n${JSON.stringify(v)}\n\`\`\``

describe('parseRulesJson', () => {
  it('reads the rules in priority order from fenced JSON, decoding entities', () => {
    const text = fence({ rules: [
      { short_name: 'Be kind', description: 'Criticise ideas &amp; not people', kind: 'all', priority: 1 },
      { short_name: 'No vendor spam', description: 'Max 1 mention every 60 days', kind: 'comment', priority: 0 },
      { description: 'no name, skipped', priority: 2 },
    ], site_rules: ['Spam'] })
    expect(parseRulesJson(text)).toEqual([
      { title: 'No vendor spam', text: 'Max 1 mention every 60 days', kind: 'comment' },
      { title: 'Be kind', text: 'Criticise ideas & not people', kind: 'all' },
    ])
  })

  it('returns null for anything that is not a rules document', () => {
    expect(parseRulesJson('Log in to Reddit')).toBeNull()
    expect(parseRulesJson(fence({ kind: 't5' }))).toBeNull()
  })
})

describe('parseAboutJson', () => {
  it('reads subscribers and the public description', () => {
    expect(parseAboutJson(fence({ kind: 't5', data: { subscribers: 824770, public_description: 'For SaaS owners', subreddit_type: 'public', over18: false } })))
      .toEqual({ subscribers: 824770, description: 'For SaaS owners', type: 'public', over18: false })
  })
})

describe('readOfficialRules', () => {
  const fetcher = (map: Record<string, { text: string } | { error: string }>) => ({ fetch: async () => new Map(Object.entries(map)) })
  const rulesUrl = 'https://www.reddit.com/r/saas/about/rules.json'
  const aboutUrl = 'https://www.reddit.com/r/saas/about.json'

  it('combines rules and about info', async () => {
    const res = await readOfficialRules(fetcher({ [rulesUrl]: { text: fence({ rules: [{ short_name: 'A', description: 'a' }] }) }, [aboutUrl]: { text: fence({ data: { subscribers: 5 } }) } }), 'saas')
    expect(res).toMatchObject({ status: 'ok', rules: [{ title: 'A' }], about: { subscribers: 5 } })
  })

  it('tells a missing sub apart from a failed fetch', async () => {
    expect(await readOfficialRules(fetcher({ [rulesUrl]: { error: 'page_not_found' } }), 'saas')).toEqual({ status: 'missing' })
    expect(await readOfficialRules(fetcher({ [rulesUrl]: { error: 'timeout' } }), 'saas')).toEqual({ status: 'failed', error: 'timeout' })
    expect(await readOfficialRules(fetcher({ [rulesUrl]: { text: 'Log in' } }), 'saas')).toEqual({ status: 'failed', error: 'unparseable' })
  })
})

describe('tinyfishFetcher', () => {
  it('posts the URLs with the key and maps results and errors by URL', async () => {
    let sent: { url: string, init: RequestInit } | null = null
    const fakeFetch = (async (url: string, init: RequestInit) => {
      sent = { url, init }
      return new Response(JSON.stringify({ results: [{ url: 'https://a.test', text: 'A' }], errors: [{ url: 'https://b.test', error: 'bot_blocked' }] }))
    }) as unknown as typeof fetch
    const out = await tinyfishFetcher('key', { fetch: fakeFetch }).fetch(['https://a.test', 'https://b.test'])
    expect(sent!.url).toBe('https://api.fetch.tinyfish.ai')
    expect((sent!.init.headers as Record<string, string>)['X-API-Key']).toBe('key')
    expect(JSON.parse(String(sent!.init.body)).urls).toEqual(['https://a.test', 'https://b.test'])
    expect(out.get('https://a.test')).toEqual({ text: 'A' })
    expect(out.get('https://b.test')).toEqual({ error: 'bot_blocked' })
  })
})
