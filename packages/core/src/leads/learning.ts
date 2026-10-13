import type { Db } from '@mochiscout/db'
import { and, desc, eq, inArray, isNotNull, isNull, or, schema, sql } from '@mochiscout/db'
import { truncate } from '@mochiscout/sources'

/**
 * The outcome loop: what a founder replies to, saves, dismisses and how they
 * rewrite drafts teaches scoring and drafting for their project.
 */

export type DismissReason = 'off_topic' | 'not_buyer' | 'self_promo' | 'already_answered' | 'closed' | 'other'

export const DISMISS_REASONS: { value: DismissReason, label: string }[] = [
  { value: 'off_topic', label: 'Not relevant' },
  { value: 'not_buyer', label: 'Not my audience' },
  { value: 'self_promo', label: 'Someone promoting their own product' },
  { value: 'already_answered', label: 'Already answered' },
  { value: 'closed', label: 'Can\'t reply (archived or locked)' },
  { value: 'other', label: 'Other' },
]

const FIT_LABEL: Partial<Record<DismissReason, string>> = { off_topic: 'not relevant', not_buyer: 'not their audience', self_promo: 'the poster is promoting their own product, not asking' }

export interface ScoringExamples {
  liked: { title: string, snippet: string | null }[]
  disliked: { title: string, why: string }[]
}

const EXAMPLES_EACH = 5

/** Recent threads the founder acted on, as calibration for scoring. Dismissals for timing reasons are left out: they say nothing about fit. */
export async function scoringExamples(db: Db, projectId: string): Promise<ScoringExamples> {
  const s = schema.threadScores
  const t = schema.threads
  const recent = desc(sql`coalesce(${s.statusChangedAt}, ${s.scoredAt})`)
  const [liked, disliked] = await Promise.all([
    db.select({ title: t.title, snippet: t.snippet }).from(s).innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(s.projectId, projectId), inArray(s.status, ['replied', 'saved'])))
      .orderBy(desc(sql`${s.status} = 'replied'`), recent).limit(EXAMPLES_EACH),
    db.select({ title: t.title, reason: s.dismissReason }).from(s).innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(s.projectId, projectId), eq(s.status, 'dismissed'), or(isNull(s.dismissReason), inArray(s.dismissReason, ['off_topic', 'not_buyer', 'self_promo']))))
      .orderBy(recent).limit(EXAMPLES_EACH),
  ])
  return {
    liked: liked.map(l => ({ title: truncate(l.title, 160), snippet: l.snippet ? truncate(l.snippet, 160) : null })),
    disliked: disliked.map(d => ({ title: truncate(d.title, 160), why: (d.reason && FIT_LABEL[d.reason]) || 'not a fit' })),
  }
}

export function scoringExamplesBrief(ex: ScoringExamples | undefined) {
  if (!ex || (!ex.liked.length && !ex.disliked.length)) return ''
  const lines = ['', 'Calibration from this founder\'s own decisions. Score similar threads the same way; these matter more than the generic rubric.']
  if (ex.liked.length) {
    lines.push('They replied to or saved:')
    for (const l of ex.liked) lines.push(`- "${l.title}"${l.snippet ? ` (${l.snippet})` : ''}`)
  }
  if (ex.disliked.length) {
    lines.push('They dismissed:')
    for (const d of ex.disliked) lines.push(`- "${d.title}" (${d.why})`)
  }
  return lines.join('\n')
}

/** Replies the founder posted, preferring ones they rewrote: their own words are the best style guide. */
export async function voiceExamples(db: Db, projectId: string, limit = 3) {
  const s = schema.threadScores
  const rows = await db.select({ reply: s.replyDraft }).from(s)
    .where(and(eq(s.projectId, projectId), eq(s.status, 'replied'), isNotNull(s.replyDraft)))
    .orderBy(desc(sql`coalesce(${s.replyAiDraft}, '') != ${s.replyDraft}`), desc(sql`coalesce(${s.statusChangedAt}, ${s.scoredAt})`))
    .limit(limit)
  return rows.map(r => truncate(r.reply!.trim(), 700)).filter(Boolean)
}

/** How much the project has taught the scorer so far (shown in the inbox). */
export async function learningStats(db: Db, projectId: string) {
  const s = schema.threadScores
  const row = await db.select({
    replied: sql<number>`sum(${s.status} = 'replied')`,
    saved: sql<number>`sum(${s.status} = 'saved')`,
    dismissed: sql<number>`sum(${s.status} = 'dismissed')`,
    edited: sql<number>`sum(${s.status} = 'replied' and ${s.replyDraft} is not null and coalesce(${s.replyAiDraft}, '') != ${s.replyDraft})`,
  }).from(s).where(eq(s.projectId, projectId)).get()
  return { replied: Number(row?.replied ?? 0), saved: Number(row?.saved ?? 0), dismissed: Number(row?.dismissed ?? 0), edited: Number(row?.edited ?? 0) }
}
