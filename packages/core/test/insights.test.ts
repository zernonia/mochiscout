import type { SubredditStats } from '@mochiscout/db'
import type { SubredditRules } from '@mochiscout/rules'
import { describe, expect, it } from 'vitest'
import { refLink, sameSite } from '../src/leads/attribution'
import { dueJobs } from '../src/schedule'
import { bestPostingTime, peakHours, subredditVerdict } from '../src/subreddits/insights'
import { rulesBrief } from '../src/drafter/generate'
import type { CustomRules } from '../src/subreddits/rules'
import { applyCustomRules } from '../src/subreddits/rules'

const stats = (over: Partial<SubredditStats> = {}): SubredditStats => ({
  posts30d: 100, hours: Array.from({ length: 24 }, (_, h) => (h === 14 ? 0.3 : h === 15 ? 0.2 : 0.5 / 22)), buyingPosts30d: 12,
  checked: 0, removed: 0, ownPosts: 0, ownPostsRemoved: 0, ownReplies: 0, ownRepliesRemoved: 0, linkedReplies: 0, linkedRepliesRemoved: 0, ...over,
})

const library = (patch: Partial<SubredditRules> = {}): SubredditRules => ({
  name: 'SaaS', promo_policy: 'allowed_with_value', self_promo_thread: null, min_karma: null, min_account_age_days: null, links_allowed: null,
  post_formats: [], cooldown_days: null, tags: ['saas'], notes: '', last_verified: '2026-10-01', official: [], keep: [], source: 'https://www.reddit.com/r/SaaS/about/rules', ...patch,
})

describe('applyCustomRules', () => {
  const custom: CustomRules = { promo_policy: 'none', self_promo_thread: '', min_karma: 100, min_account_age_days: null, links_allowed: 'none', cooldown_days: 30, notes: 'Mods are strict.' }
  it('puts the project\'s fields over the library file and keeps its official rules and tags', () => {
    const official = [{ title: 'No spam', text: '', kind: 'all' as const }]
    expect(applyCustomRules('saas', library({ official }), custom, new Date('2026-10-12'))).toMatchObject({
      name: 'SaaS', promo_policy: 'none', self_promo_thread: null, min_karma: 100, cooldown_days: 30, notes: 'Mods are strict.', tags: ['saas'], official, last_verified: '2026-10-12',
    })
  })
  it('works for subs that aren\'t in the library', () => {
    expect(applyCustomRules('tinysub', null, custom, new Date('2026-10-12'))).toMatchObject({ name: 'tinysub', tags: ['custom'], official: [], source: 'https://www.reddit.com/r/tinysub/about/rules' })
  })
})

describe('rulesBrief', () => {
  it('adds the official rules, abridged, to the prompt', () => {
    const long = 'x'.repeat(500)
    const brief = rulesBrief('saas', library({ cooldown_days: 60, official: [{ title: 'No vendor spam', text: `Max 1 mention every 60 days. ${long}`, kind: 'all' }, { title: 'Text only', text: '', kind: 'link' }] }))
    expect(brief).toContain('at most one promotional mention every 60 days')
    expect(brief).toContain('1. No vendor spam: Max 1 mention every 60 days.')
    expect(brief).toContain('2. Text only [posts]')
    expect(brief).not.toContain(long)
  })
})

describe('subredditVerdict', () => {
  const rules = library()
  it('starts from the rules', () => {
    expect(subredditVerdict(rules, null).grade).toBe('friendly')
    expect(subredditVerdict({ ...rules!, promo_policy: 'none' }, null).grade).toBe('strict')
    expect(subredditVerdict(null, null)).toMatchObject({ grade: 'unknown', removalRate: null })
  })
  it('tightens the grade when moderators remove a lot, once there are enough samples', () => {
    expect(subredditVerdict(rules, stats({ checked: 5, removed: 4 })).removalRate).toBeNull()
    const v = subredditVerdict(rules, stats({ checked: 40, removed: 12 }))
    expect(v.grade).toBe('strict')
    expect(v.reasons.join(' ')).toContain('removed 30% of the posts')
  })
  it('warns about links when linked replies get removed', () => {
    const v = subredditVerdict(null, stats({ checked: 20, removed: 1, linkedReplies: 10, linkedRepliesRemoved: 6 }))
    expect(v.grade).toBe('careful')
    expect(v.reasons.at(-1)).toContain('Leave the link out')
  })
})

describe('peakHours', () => {
  it('lists the busiest UTC hours first', () => {
    expect(peakHours(stats()).map(h => h.hour)).toEqual([14, 15, 0])
  })
})

describe('attribution', () => {
  it('adds the ref parameter to the founder\'s own URL', () => {
    expect(refLink('https://shipnote.app', 'abc1234')).toBe('https://shipnote.app/?ref=ms_abc1234')
    expect(refLink('https://shipnote.app/pricing?x=1', 'abc1234')).toBe('https://shipnote.app/pricing?x=1&ref=ms_abc1234')
  })
  it('only accepts events from the project\'s own site', () => {
    expect(sameSite('https://www.shipnote.app', 'https://shipnote.app')).toBe(true)
    expect(sameSite('https://app.shipnote.app', 'https://shipnote.app')).toBe(true)
    expect(sameSite('https://evil.test', 'https://shipnote.app')).toBe(false)
    expect(sameSite(null, 'https://shipnote.app')).toBe(true)
  })
})

describe('schedule', () => {
  it('runs insights daily at 05:00', () => {
    expect(dueJobs(new Date('2026-10-10T05:00:00Z'))).toContain('insights')
    expect(dueJobs(new Date('2026-10-10T06:00:00Z'))).not.toContain('insights')
  })
})

describe('bestPostingTime', () => {
  // Busiest at 14:00 and 15:00 UTC (see stats()).
  it('finds the busiest two-hour window and when it next starts', () => {
    const t = bestPostingTime(stats(), new Date('2026-10-14T09:30:00Z'))!
    expect(t.peakStartHour).toBe(14)
    expect(t.nextPeakAt.toISOString()).toBe('2026-10-14T14:00:00.000Z')
    expect(t.goodNow).toBe(false)
  })
  it('rolls over to tomorrow once today\'s window has passed', () => {
    expect(bestPostingTime(stats(), new Date('2026-10-14T20:00:00Z'))!.nextPeakAt.toISOString()).toBe('2026-10-15T14:00:00.000Z')
  })
  it('says now during the window', () => {
    const now = new Date('2026-10-14T15:10:00Z')
    const t = bestPostingTime(stats(), now)!
    expect(t.nextPeakAt).toBe(now)
    expect(t.goodNow).toBe(true)
  })
  it('wraps past midnight', () => {
    const hours = Array.from({ length: 24 }, (_, h) => (h === 23 || h === 0 ? 0.4 : 0.2 / 22))
    expect(bestPostingTime(stats({ hours }), new Date('2026-10-14T10:00:00Z'))!.peakStartHour).toBe(23)
  })
  it('gives no answer with too little data', () => {
    expect(bestPostingTime(stats({ posts30d: 5 }))).toBeNull()
    expect(bestPostingTime(null)).toBeNull()
  })
})
