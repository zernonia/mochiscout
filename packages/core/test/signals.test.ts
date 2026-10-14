import type { SubredditRules } from '@mochiscout/rules'
import { describe, expect, it } from 'vitest'
import { alsoAsking, asksForDm, dmsDiscouraged, invitesDm, openToDms } from '../src/leads/signals'

const rules = (patch: Partial<SubredditRules> = {}): SubredditRules => ({
  name: 'SaaS', promo_policy: 'allowed_with_value', self_promo_thread: null, min_karma: null, min_account_age_days: null, links_allowed: null,
  post_formats: [], cooldown_days: null, tags: [], notes: '', last_verified: '2026-10-01', official: [], keep: [], source: 'https://www.reddit.com/r/SaaS/about/rules', ...patch,
})

describe('alsoAsking', () => {
  const c = (author: string, text: string) => ({ author, text })
  it('finds short "me too" comments from people other than the poster', () => {
    const found = alsoAsking([
      c('op', 'Following up: still looking'),
      c('a', 'Same here, did you find anything?'),
      c('b', 'Following'),
      c('c', 'Try Notion, it does this well.'),
      c('d', "I'm also looking for something like this for my team"),
      c('e', '+1 would love to know'),
      c('f', `Following ${'long story '.repeat(60)}`),
    ], 'OP')
    expect(found.map(x => x.author)).toEqual(['a', 'b', 'd', 'e'])
  })
  it('handles missing comments', () => {
    expect(alsoAsking(null, 'op')).toEqual([])
  })
})

describe('DM signals', () => {
  it('spots an invitation to message', () => {
    expect(invitesDm('Looking for a CRM. Feel free to DM me recommendations')).toBe(true)
    expect(invitesDm('My DMs are open if you built something')).toBe(true)
    expect(invitesDm('Please no DMs, reply here')).toBe(false)
    expect(invitesDm('What CRM do you use?')).toBe(false)
  })
  it('spots a reply asking to be messaged', () => {
    expect(asksForDm('Can you DM me the link?')).toBe(true)
    expect(asksForDm('send me the details please')).toBe(true)
    expect(asksForDm('Thanks, that helps')).toBe(false)
  })
  it('reads rules that discourage DMs', () => {
    expect(dmsDiscouraged(rules({ notes: 'No dropping URLs, asking people to DM you or pointing them to your profile.' }))).toBe(true)
    expect(dmsDiscouraged(rules({ official: [{ title: 'No unsolicited PMs', text: '' }] as any }))).toBe(true)
    expect(dmsDiscouraged(rules({ notes: 'Be kind.' }))).toBe(false)
    expect(dmsDiscouraged(null)).toBe(false)
  })
  it('flags a thread open to DMs only where messages exist and are welcome', () => {
    const t = { platform: 'reddit', title: 'Need a changelog tool', body: 'DM me if you have one' }
    expect(openToDms(t, null)).toBe(true)
    expect(openToDms({ ...t, platform: 'hn' }, null)).toBe(false)
    expect(openToDms(t, rules({ notes: 'Do not ask people to DM you.' }))).toBe(false)
  })
})
