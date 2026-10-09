import type { SubredditRules } from '@mochiscout/rules'
import { describe, expect, it } from 'vitest'
import { checkDraft, worst } from '../src/drafter/checks'

const now = new Date('2026-10-08T12:00:00Z')
const days = (n: number) => new Date(now.getTime() - n * 86_400_000)

const rules = (patch: Partial<SubredditRules> = {}): SubredditRules => ({
  name: 'test',
  promo_policy: 'allowed_with_value',
  self_promo_thread: null,
  min_karma: null,
  min_account_age_days: null,
  links_allowed: 'yes',
  post_formats: ['text'],
  cooldown_days: 7,
  tags: ['x'],
  notes: '',
  last_verified: '2026-10-01',
  source: 'https://www.reddit.com/r/test/about/rules',
  ...patch,
})

type Opts = Parameters<typeof checkDraft>[0]

const base: Opts = {
  draft: { subreddit: 'test', title: 'How I priced my app', body: 'Story here', promo: true },
  rules: rules(),
  account: { karma: 500, createdAt: days(400), status: 'ok' },
  history: [],
  now,
}

const levels = (o: Partial<Omit<Opts, 'draft'>> & { draft?: Partial<Opts['draft']> }) => {
  const results = checkDraft({ ...base, ...o, draft: { ...base.draft, ...o.draft } })
  return Object.fromEntries(results.map(r => [r.id, r.level]))
}

describe('checkDraft', () => {
  it('passes a clean promo post', () => {
    const r = checkDraft(base)
    expect(worst(r.map(x => x.level))).toBe('pass')
  })
  it('hard-fails promo where promotion is not allowed, but not non-promo posts', () => {
    expect(levels({ rules: rules({ promo_policy: 'none' }) }).promo).toBe('fail')
    expect(levels({ rules: rules({ promo_policy: 'weekly_thread_only' }) }).promo).toBe('fail')
    expect(levels({ rules: rules({ promo_policy: 'none' }), draft: { promo: false } }).promo).toBe('pass')
  })
  it('warns when the sub is not in the rules DB', () => {
    expect(levels({ rules: null }).rules).toBe('warn')
  })
  it('checks links against the sub', () => {
    const draft = { body: 'see https://acme.test' }
    expect(levels({ draft }).links).toBe('pass')
    expect(levels({ draft, rules: rules({ links_allowed: 'in_comments_only' }) }).links).toBe('fail')
    expect(levels({ draft, rules: rules({ links_allowed: 'none' }) }).links).toBe('fail')
    expect(levels({ draft, rules: rules({ links_allowed: null }) }).links).toBe('warn')
  })
  it('checks karma and account age when the sub publishes minimums', () => {
    const strict = rules({ min_karma: 1000, min_account_age_days: 30 })
    expect(levels({ rules: strict })).toMatchObject({ karma: 'fail' })
    expect(levels({ rules: strict, account: { karma: null, createdAt: null, status: null } })).toMatchObject({ karma: 'warn', age: 'warn' })
    expect(levels({ rules: strict, account: { karma: 5000, createdAt: days(10), status: 'ok' } })).toMatchObject({ age: 'fail' })
  })
  it('enforces the per-sub cooldown and the daily promo cap', () => {
    expect(levels({ history: [{ subreddit: 'test', postedAt: days(3), promo: true }] }).cooldown).toBe('fail')
    expect(levels({ history: [{ subreddit: 'test', postedAt: days(8), promo: true }] }).cooldown).toBeUndefined()
    expect(levels({ history: [{ subreddit: 'test', postedAt: days(3), promo: false }] }).cooldown).toBeUndefined()
    expect(levels({ history: [{ subreddit: 'other', postedAt: new Date(now.getTime() - 3_600_000), promo: true }] }).daily).toBe('fail')
  })
  it('fails when the account looks shadowbanned', () => {
    expect(levels({ account: { karma: 1, createdAt: null, status: 'not_found' } }).account).toBe('fail')
  })
  it('fails over-long titles', () => {
    expect(levels({ draft: { title: 'x'.repeat(301) } }).title).toBe('fail')
  })
})
