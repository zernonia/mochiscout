import type { ThreadComment, ThreadState } from '@mochiscout/sources'
import { stateFromAge } from '@mochiscout/sources'

/** Inputs for ranking one scored thread. */
export interface LeadInput {
  id: string
  platform: string
  intent: number
  state: ThreadState
  createdUtc: Date | null
  engagement: unknown
  comments: ThreadComment[] | null
  searchRankFlag: boolean
}

export interface LeadAssessment {
  /** Stored state, or archived when the thread is past the platform's reply window. */
  state: ThreadState
  /** 0-100: intent adjusted for freshness, competition and visibility. 0 when closed. */
  opportunity: number
  /** Open, high intent, under a day old and not crowded: reply now. */
  hot: boolean
  ageHours: number | null
  commentCount: number | null
  /** Competitors already named in the replies. */
  competitorMentions: string[]
}

export const HOT_MIN_INTENT = 75
export const HOT_MAX_AGE_HOURS = 24
export const HOT_MAX_COMMENTS = 15

function num(record: unknown, ...keys: string[]): number | null {
  if (!record || typeof record !== 'object') return null
  for (const k of keys) {
    const v = (record as Record<string, unknown>)[k]
    if (typeof v === 'number') return v
  }
  return null
}

function freshness(ageHours: number | null) {
  if (ageHours === null) return 0.75
  if (ageHours <= 6) return 1
  if (ageHours <= 24) return 0.95
  if (ageHours <= 72) return 0.85
  if (ageHours <= 168) return 0.7
  return 0.55
}

function competition(comments: number | null) {
  if (comments === null) return 0
  if (comments <= 3) return 3
  if (comments <= 15) return 0
  if (comments <= 40) return -6
  return -12
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Competitor names (as entered at onboarding, e.g. "Acme (acme.com)") found in the replies. */
export function competitorMentions(comments: ThreadComment[] | null, competitors: string[]) {
  if (!comments?.length || !competitors.length) return []
  const text = comments.map(c => c.text).join('\n')
  return competitors
    .map(c => c.replace(/\s*\(.*\)\s*$/, '').trim())
    .filter(name => name.length > 1 && new RegExp(`(^|[^\\w])${escapeRe(name)}([^\\w]|$)`, 'i').test(text))
}

export function isClosed(state: ThreadState) {
  return state !== 'open'
}

export function assessLead(t: LeadInput, competitors: string[], now: Date): LeadAssessment {
  const state = t.state !== 'open' ? t.state : stateFromAge(t.platform, t.createdUtc, now, t.id) ?? 'open'
  const ageHours = t.createdUtc ? Math.max(0, (now.getTime() - t.createdUtc.getTime()) / 3_600_000) : null
  const commentCount = num(t.engagement, 'comments', 'replies') ?? t.comments?.length ?? null
  const mentions = competitorMentions(t.comments, competitors)
  const upvotes = num(t.engagement, 'points', 'likes', 'score') ?? 0

  const adjust = competition(commentCount)
    - (mentions.length ? 4 : 0)
    + (t.searchRankFlag ? 4 : 0)
    + (upvotes >= 50 ? 3 : 0)
  const opportunity = isClosed(state) ? 0 : Math.max(0, Math.min(100, Math.round(t.intent * freshness(ageHours) + adjust)))
  const hot = !isClosed(state)
    && t.intent >= HOT_MIN_INTENT
    && ageHours !== null && ageHours <= HOT_MAX_AGE_HOURS
    && (commentCount ?? 0) <= HOT_MAX_COMMENTS

  return { state, opportunity, hot, ageHours, commentCount, competitorMentions: mentions }
}
