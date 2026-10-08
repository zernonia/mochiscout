import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { SubredditRules } from '../src/schema'

const fixture = parse(readFileSync(new URL('./fixtures/example.yaml', import.meta.url), 'utf8'))

describe('SubredditRules', () => {
  it('accepts a complete file', () => {
    expect(SubredditRules.parse(fixture)).toMatchObject({ name: 'ExampleSub', min_karma: null, min_account_age_days: 30 })
  })
  it('defaults unknown fields to null', () => {
    const { min_karma, links_allowed, cooldown_days, ...rest } = fixture
    expect(SubredditRules.parse(rest)).toMatchObject({ min_karma: null, links_allowed: null, cooldown_days: null })
  })
  it.each([
    ['missing last_verified', { last_verified: undefined }],
    ['bad promo policy', { promo_policy: 'sometimes' }],
    ['r/ prefix in name', { name: 'r/ExampleSub' }],
    ['source not a rules page', { source: 'https://example.com' }],
    ['unknown field', { karma: 10 }],
    ['no tags', { tags: [] }],
  ])('rejects %s', (_, patch) => {
    expect(SubredditRules.safeParse({ ...fixture, ...patch }).success).toBe(false)
  })
})
