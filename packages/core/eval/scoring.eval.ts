/**
 * Scoring eval: re-score threads the founder already decided on (replied or
 * saved = good lead, dismissed as not relevant / not their audience = bad)
 * with the current scoring prompt, and compare with the stored scores.
 *
 *   1. Export decisions:  apps/web/scripts/export-scoring-labels.sh > labels.json
 *   2. Run:               LABELS=labels.json ANTHROPIC_API_KEY=… pnpm --filter @mochiscout/core eval:scoring
 *
 * Writes eval/out/scoring-<timestamp>.json with metrics and the disagreements.
 */
import type { Label } from '../src/scoring/quality'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createLlm } from '@mochiscout/llm'
import { describe, expect, it } from 'vitest'
import { evalMetrics, labelFor } from '../src/scoring/quality'
import { SCORE_BATCH, scoreThreads } from '../src/scoring/score'

interface Row {
  project_id: string
  name: string
  url: string
  category: string | null
  icp: string | null
  problems_json: string
  competitors_json: string
  intent_threshold: number
  thread_id: string
  platform: string
  channel: string | null
  title: string
  snippet: string | null
  intent: number
  status: string
  dismiss_reason: string | null
}

function loadRows(path: string): Row[] {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  // `wrangler d1 execute --json` wraps rows as [{ results: [...] }].
  return Array.isArray(raw) && raw[0]?.results ? raw.flatMap((r: { results: Row[] }) => r.results) : raw
}

const labelsPath = process.env.LABELS
const apiKey = process.env.ANTHROPIC_API_KEY

describe.skipIf(!labelsPath || !apiKey)('scoring eval', () => {
  it('re-scores decided threads and compares with the founder\'s decisions', async () => {
    const llm = createLlm({ anthropicApiKey: apiKey!, models: process.env.LLM_FAST_MODEL ? { fast: process.env.LLM_FAST_MODEL } : {} })
    const rows = loadRows(labelsPath!).flatMap((r) => {
      const label = labelFor(r.status, r.dismiss_reason)
      return label ? [{ ...r, label: label as Label }] : []
    })
    expect(rows.length).toBeGreaterThan(0)

    const byProject = new Map<string, typeof rows>()
    for (const r of rows) byProject.set(r.project_id, [...(byProject.get(r.project_id) ?? []), r])
    const results: { id: string, project: string, title: string, label: Label, stored: number, now: number, threshold: number }[] = []
    for (const [, items] of byProject) {
      const p = items[0]!
      const project = { name: p.name, url: p.url, category: p.category, icp: p.icp, problems: JSON.parse(p.problems_json), competitors: JSON.parse(p.competitors_json) }
      for (let i = 0; i < items.length; i += SCORE_BATCH) {
        const batch = items.slice(i, i + SCORE_BATCH)
        const res = await scoreThreads(llm, project, batch.map(b => ({ platform: b.platform, channel: b.channel, title: b.title, snippet: b.snippet })))
        batch.forEach((b, j) => results.push({ id: b.thread_id, project: p.name, title: b.title, label: b.label, stored: b.intent, now: res.scores[j]?.intent ?? 0, threshold: p.intent_threshold }))
      }
    }

    const threshold = Number(process.env.THRESHOLD ?? results[0]!.threshold)
    const stored = evalMetrics(results.map(r => ({ label: r.label, intent: r.stored })), threshold)
    const current = evalMetrics(results.map(r => ({ label: r.label, intent: r.now })), threshold)
    const disagreements = results
      .filter(r => (r.now >= threshold) !== (r.label === 'good'))
      .sort((a, b) => Math.abs(b.now - threshold) - Math.abs(a.now - threshold))

    const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`)
    console.log(`\nScoring eval: ${results.length} labelled threads, threshold ${threshold}`)
    console.table({
      'stored scores': { precision: pct(stored.precision), recall: pct(stored.recall), accuracy: pct(stored.accuracy) },
      'current prompt': { precision: pct(current.precision), recall: pct(current.recall), accuracy: pct(current.accuracy) },
    })
    console.log('Biggest disagreements (current prompt):')
    for (const d of disagreements.slice(0, 10)) console.log(`  ${d.label === 'good' ? 'missed lead ' : 'false lead  '} ${String(d.now).padStart(3)}  ${d.title.slice(0, 90)}`)

    mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
    const out = new URL(`./out/scoring-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, import.meta.url)
    writeFileSync(out, JSON.stringify({ threshold, stored, current, disagreements }, null, 2))
    console.log(`\nSaved ${out.pathname}`)
  })
})
