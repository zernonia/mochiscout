import type { Db } from '@mochiscout/db'
import type { SubredditStats } from '@mochiscout/db'
import type { SubredditRules } from '@mochiscout/rules'
import type { SubredditVerdict } from './insights'
import type { RulesSource } from './rules'
import { and, count, eq, inArray, schema, sql } from '@mochiscout/db'
import { getRules, rulesForTags } from '@mochiscout/rules'
import { subredditVerdict } from './insights'
import { resolveRulesMany } from './rules'

const PROMO_WEIGHT: Record<SubredditRules['promo_policy'], number> = {
  none: 0,
  weekly_thread_only: 0.4,
  flair_only: 0.5,
  allowed_with_value: 0.8,
  allowed: 1,
}
/** Policy unknown (sub not in the rules DB yet). */
const PROMO_UNKNOWN = 0.5
/** Scored threads at which evidence counts as strong. */
const EVIDENCE_FULL = 20

export interface SubredditEvidence {
  /** Threads scored for this project. */
  scored: number
  /** Scored threads at or above the project's intent threshold. */
  hits: number
  avgIntent: number
  /** Matched threads still waiting for scoring. */
  pending: number
}

export interface SubredditCandidate {
  name: string
  watching: boolean
  fit: number
  evidence: SubredditEvidence
  /** The project's own copy, else the rules library's (with the sub's official rules). */
  rules: SubredditRules | null
  rulesSource: RulesSource | null
  /** The library's version (or the automatically read one), to compare with or reset to. */
  libraryRules: SubredditRules | null
  /** Subs outside the library: when their official rules were last read (null: not yet). */
  rulesReadAt: Date | null
  /** Pooled outcomes across all users, once the sub has enough activity. */
  stats: SubredditStats | null
  verdict: SubredditVerdict
  /** Why it is listed: watched, seen in results, or suggested by rules-DB tags. */
  sources: ('watched' | 'threads' | 'rules')[]
}

/**
 * Fit score 0-100 (arch §7.3), weighted from how often the sub shows up in this
 * project's relevant threads, how many of those show buying intent, and its
 * promo policy. Subscriber size is not available without the Reddit API.
 */
export function fitScore(e: SubredditEvidence, rules: SubredditRules | null): number {
  const evidence = Math.min(1, Math.log2(1 + e.scored + e.pending) / Math.log2(1 + EVIDENCE_FULL))
  const density = e.scored ? e.hits / e.scored : 0
  const promo = rules ? PROMO_WEIGHT[rules.promo_policy] : PROMO_UNKNOWN
  return Math.round(100 * (0.35 * evidence + 0.35 * density + 0.15 * (e.avgIntent / 100) + 0.15 * promo))
}

export async function subredditMap(
  db: Db,
  project: { id: string, category: string | null, keywords: string[], intentThreshold: number },
): Promise<SubredditCandidate[]> {
  const t = schema.threads
  const s = schema.threadScores
  const q = schema.scoreQueue

  const [scored, pending, watched] = await Promise.all([
    db
      .select({
        name: t.channel,
        scored: count(),
        hits: sql<number>`sum(case when ${s.intent} >= ${project.intentThreshold} then 1 else 0 end)`,
        avgIntent: sql<number>`avg(${s.intent})`,
      })
      .from(s)
      .innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(s.projectId, project.id), sql`${t.channel} is not null`))
      .groupBy(t.channel),
    db
      .select({ name: t.channel, n: count() })
      .from(q)
      .innerJoin(t, eq(t.id, q.threadId))
      .where(and(eq(q.projectId, project.id), sql`${t.channel} is not null`))
      .groupBy(t.channel),
    db
      .select({ name: schema.projectSubreddits.subreddit, watching: schema.projectSubreddits.watching })
      .from(schema.projectSubreddits)
      .where(eq(schema.projectSubreddits.projectId, project.id)),
  ])

  const byName = new Map<string, SubredditCandidate>()
  const get = (raw: string) => {
    const name = raw.toLowerCase()
    let c = byName.get(name)
    if (!c) {
      c = {
        name,
        watching: false,
        fit: 0,
        evidence: { scored: 0, hits: 0, avgIntent: 0, pending: 0 },
        rules: getRules(name) ?? null,
        rulesSource: null,
        libraryRules: null,
        rulesReadAt: null,
        stats: null,
        verdict: { grade: 'unknown', removalRate: null, linkedReplyRemovalRate: null, reasons: [] },
        sources: [],
      }
      byName.set(name, c)
    }
    return c
  }

  for (const row of scored) {
    const c = get(row.name!)
    c.evidence.scored = row.scored
    c.evidence.hits = Number(row.hits ?? 0)
    c.evidence.avgIntent = Math.round(Number(row.avgIntent ?? 0))
    c.sources.push('threads')
  }
  for (const row of pending) {
    const c = get(row.name!)
    c.evidence.pending = row.n
    if (!c.sources.includes('threads')) c.sources.push('threads')
  }
  for (const r of rulesForTags([project.category ?? '', ...project.keywords])) {
    get(r.name).sources.push('rules')
  }
  for (const row of watched) {
    const c = get(row.name)
    c.watching = row.watching
    if (row.watching) c.sources.unshift('watched')
  }

  const names = [...byName.keys()]
  const [resolved, statRows] = await Promise.all([
    resolveRulesMany(db, names, project.id),
    names.length
      ? db.select({ name: schema.subreddits.name, stats: schema.subreddits.stats }).from(schema.subreddits).where(inArray(schema.subreddits.name, names.slice(0, 90)))
      : Promise.resolve([]),
  ])
  const statsByName = new Map(statRows.map(r => [r.name, r.stats]))
  for (const c of byName.values()) {
    const r = resolved.get(c.name)
    c.rules = r?.rules ?? null
    c.rulesSource = r?.source ?? null
    c.libraryRules = r?.library ?? null
    c.rulesReadAt = r?.readAt ?? null
    c.stats = statsByName.get(c.name) ?? null
    c.verdict = subredditVerdict(c.rules, c.stats)
    c.fit = fitScore(c.evidence, c.rules)
  }
  return [...byName.values()].sort((a, b) => Number(b.watching) - Number(a.watching) || b.fit - a.fit)
}

export function normalizeSubredditName(input: string): string | null {
  const name = input.trim().replace(/^(https?:\/\/(www\.|old\.)?reddit\.com)?\/?r\//i, '').replace(/\/.*$/, '')
  return /^\w{2,21}$/.test(name) ? name.toLowerCase() : null
}
