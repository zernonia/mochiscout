import { describe, expect, it } from 'vitest'
import { createMatcher, isMakerPost } from '../src/scoring/prefilter'

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

describe('isMakerPost', () => {
  it.each([
    'classical w no lyrics is my go to for focus so i made a free ...',
    'I built a lofi player for deep work',
    'We just launched our changelog tool',
    'Show HN: A tiny CRM for freelancers',
    'Introducing Lofi Space, ambient sound for your Mac',
    'I\'m building a habit tracker, would love feedback',
    'My first SaaS is live, roast it',
  ])('flags "%s"', (title) => {
    expect(isMakerPost(title)).toBe(true)
  })

  it.each([
    'Any free alternatives to Brain.fm?',
    'We built our MVP on Bubble, looking for an alternative',
    'I made the switch from Notion, what do you use for tasks',
    'I built a spreadsheet for invoices but it is a mess. Is there an app for this?',
    'I got so frustrated trying to find the perfect lofi background music',
  ])('leaves "%s" to the model', (title) => {
    expect(isMakerPost(title)).toBe(false)
  })
})
