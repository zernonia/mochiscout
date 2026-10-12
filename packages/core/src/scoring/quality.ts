import type { Db } from '@mochiscout/db'
import { and, eq, inArray, schema } from '@mochiscout/db'

/**
 * How good the intent scores are, judged by what the founder did with each
 * thread: replied or saved means it was a real lead; dismissed as not
 * relevant or not their audience means it wasn't. Dismissals for timing
 * (closed, already answered) or "other" say nothing about the score.
 */
export type Label = 'good' | 'bad'

export function labelFor(status: string, dismissReason: string | null): Label | null {
  if (status === 'replied' || status === 'saved') return 'good'
  if (status === 'dismissed' && (dismissReason === null || dismissReason === 'off_topic' || dismissReason === 'not_buyer')) return 'bad'
  return null
}

export const INTENT_BANDS = [
  { label: '60–74', min: 60, max: 74 },
  { label: '75–89', min: 75, max: 89 },
  { label: '90–100', min: 90, max: 100 },
] as const

/** Decisions per band before a precision figure is shown. */
export const BAND_MIN_SAMPLES = 5

export interface BandQuality { label: string, good: number, bad: number, precision: number | null }

export function precisionByBand(rows: { intent: number, label: Label }[]): BandQuality[] {
  return INTENT_BANDS.map((b) => {
    const inBand = rows.filter(r => r.intent >= b.min && r.intent <= b.max)
    const good = inBand.filter(r => r.label === 'good').length
    const bad = inBand.length - good
    return { label: b.label, good, bad, precision: inBand.length >= BAND_MIN_SAMPLES ? good / inBand.length : null }
  })
}

/** Precision of the inbox (everything at or above the threshold) and per intent band, from real decisions. */
export async function scoringQuality(db: Db, project: { id: string, intentThreshold: number }) {
  const s = schema.threadScores
  const rows = await db.select({ intent: s.intent, status: s.status, dismissReason: s.dismissReason })
    .from(s)
    .where(and(eq(s.projectId, project.id), inArray(s.status, ['replied', 'saved', 'dismissed'])))
  const labeled = rows.flatMap((r) => {
    const label = labelFor(r.status, r.dismissReason)
    return label ? [{ intent: r.intent, label }] : []
  })
  const inbox = labeled.filter(r => r.intent >= project.intentThreshold)
  const good = inbox.filter(r => r.label === 'good').length
  return {
    decisions: labeled.length,
    precision: inbox.length >= BAND_MIN_SAMPLES ? good / inbox.length : null,
    bands: precisionByBand(labeled),
  }
}

export interface EvalExample { id: string, label: Label, storedIntent: number }

export interface EvalMetrics {
  n: number
  precision: number | null
  recall: number | null
  accuracy: number | null
  truePositive: number
  falsePositive: number
  falseNegative: number
  trueNegative: number
}

/** Classification metrics for "intent at or above the threshold" against the founder's labels. */
export function evalMetrics(examples: { label: Label, intent: number }[], threshold: number): EvalMetrics {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const e of examples) {
    const predicted = e.intent >= threshold
    if (predicted && e.label === 'good') tp++
    else if (predicted) fp++
    else if (e.label === 'good') fn++
    else tn++
  }
  const ratio = (a: number, b: number) => (b ? a / b : null)
  return {
    n: examples.length,
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    accuracy: ratio(tp + tn, examples.length),
    truePositive: tp,
    falsePositive: fp,
    falseNegative: fn,
    trueNegative: tn,
  }
}
