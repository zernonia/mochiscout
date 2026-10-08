import { describe, expect, it } from 'vitest'
import { digestDueToday, PLANS, QuotaError } from '../src/plans'

describe('plans', () => {
  it('self-host is unlimited', () => {
    expect(PLANS.selfhost.projects).toBe(Infinity)
    expect(PLANS.selfhost.mcp).toBe(true)
  })
  it('suggests the cheapest plan that lifts a limit', () => {
    expect(new QuotaError('watchedSubreddits', 'free', 3, '').upgradeTo).toBe('solo')
    expect(new QuotaError('projects', 'free', 1, '').upgradeTo).toBe('pro')
    expect(new QuotaError('mcp', 'solo', false, '').upgradeTo).toBe('pro')
    expect(new QuotaError('projects', 'pro', 5, '').upgradeTo).toBeNull()
  })
  it('sends weekly digests on Mondays only', () => {
    expect(digestDueToday('free', 1)).toBe(true)
    expect(digestDueToday('free', 3)).toBe(false)
    expect(digestDueToday('solo', 3)).toBe(true)
  })
})
