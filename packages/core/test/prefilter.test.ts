import { describe, expect, it } from 'vitest'
import { createMatcher } from '../src/scoring/prefilter'

const match = createMatcher({
  category: 'invoicing app',
  keywords: ['invoice reminders', 'late payments'],
  competitors: ['FreshBooks'],
})

describe('createMatcher', () => {
  it('matches keyword phrases case-insensitively', () => {
    expect(match('How do you handle LATE PAYMENTS from clients?')).toEqual(['late payments'])
  })
  it('matches multi-word keywords when all words appear', () => {
    expect(match('Sending reminders about each invoice manually is killing me')).toEqual(['invoice reminders'])
    expect(match('Every invoice I send is ignored')).toEqual([])
  })
  it('matches competitors on word boundaries', () => {
    expect(match('Leaving FreshBooks, what next?')).toEqual(['FreshBooks'])
    expect(match('freshbooksy is not a word')).toEqual([])
  })
  it('needs an intent phrase for category-only matches', () => {
    expect(match('I built an invoicing app')).toEqual([])
    expect(match('Looking for an invoicing app for freelancers')).toEqual(['invoicing app + "looking for"'])
  })
})
