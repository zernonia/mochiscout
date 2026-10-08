import { describe, expect, it } from 'vitest'
import { nextInterval } from '../src/jobs/fetch'
import { dueJobs } from '../src/schedule'

const at = (iso: string) => new Date(`2026-10-08T${iso}:00Z`)

describe('dueJobs', () => {
  it('runs plan-fetch every tick', () => {
    expect(dueJobs(at('10:15'))).toEqual(['plan-fetch', 'score'])
  })
  it('runs digest hourly and discovery every 6h on the hour', () => {
    expect(dueJobs(at('10:00'))).toEqual(['plan-fetch', 'score', 'digest'])
    expect(dueJobs(at('12:00'))).toEqual(['plan-fetch', 'search-discovery', 'score', 'digest'])
  })
  it('runs tracker at :30 every 12h and retention at 03:00', () => {
    expect(dueJobs(at('12:30'))).toEqual(['plan-fetch', 'score', 'tracker'])
    expect(dueJobs(at('03:00'))).toEqual(['plan-fetch', 'score', 'digest', 'retention'])
  })
  it('tolerates late ticks', () => {
    expect(dueJobs(at('12:02'))).toContain('search-discovery')
  })
})

describe('nextInterval', () => {
  it('clamps between 15 minutes and 6 hours', () => {
    expect(nextInterval(0)).toBe(360)
    expect(nextInterval(1000)).toBe(15)
    expect(nextInterval(0.5)).toBe(360)
  })
  it('targets about ten posts per fetch', () => {
    expect(nextInterval(10)).toBe(60)
    expect(nextInterval(5)).toBe(120)
  })
})
