import { describe, expect, it } from 'vitest'
import { draftLimit } from '../src/plans'
import { isAppTrial, renderTrialEmail, trialDaysLeft, trialStart } from '../src/trial'

const now = new Date('2026-10-12T12:00:00Z')

describe('Pro trial', () => {
  it('starts on Pro for 14 days', () => {
    expect(trialStart(now)).toEqual({ plan: 'pro', planStatus: 'trialing', trialEndsAt: new Date('2026-10-26T12:00:00Z') })
  })

  it('is the free trial only without a Polar subscription', () => {
    expect(isAppTrial({ planStatus: 'trialing', polarSubscriptionId: null })).toBe(true)
    expect(isAppTrial({ planStatus: 'trialing', polarSubscriptionId: 'sub_1' })).toBe(false)
    expect(isAppTrial({ planStatus: 'active', polarSubscriptionId: null })).toBe(false)
  })

  it('counts days left, rounded up', () => {
    expect(trialDaysLeft(new Date('2026-10-13T11:00:00Z'), now)).toBe(1)
    expect(trialDaysLeft(new Date('2026-10-26T12:00:00Z'), now)).toBe(14)
    expect(trialDaysLeft(new Date('2026-10-01T00:00:00Z'), now)).toBe(0)
    expect(trialDaysLeft(null, now)).toBe(0)
  })

  it('caps AI drafts during the trial, not on a paid Pro plan', () => {
    expect(draftLimit({ plan: 'pro', planStatus: 'trialing', polarSubscriptionId: null })).toBe(150)
    expect(draftLimit({ plan: 'pro', planStatus: 'active', polarSubscriptionId: 'sub_1' })).toBe(1500)
    expect(draftLimit({ plan: 'free' })).toBe(30)
  })

  it('writes the reminder and the ended email', () => {
    const ending = renderTrialEmail('ending', 'https://mochiscout.com', { name: 'Ada Lovelace', leads: 12, daysLeft: 3 })
    expect(ending.subject).toBe('Your Mochiscout Pro trial ends in 3 days')
    expect(ending.text).toContain('Hi Ada,')
    expect(ending.text).toContain('found 12 threads')
    expect(ending.text).toContain('https://mochiscout.com/app/billing')
    const ended = renderTrialEmail('ended', 'https://mochiscout.com', { name: null, leads: 0, daysLeft: 0 })
    expect(ended.subject).toBe('Your Mochiscout Pro trial has ended')
    expect(ended.html).not.toContain('<script')
  })
})
