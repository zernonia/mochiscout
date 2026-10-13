import type { Db } from '@mochiscout/db'
import { and, desc, eq, gte, schema, sql } from '@mochiscout/db'

/**
 * Proof of ROI. Each thread gets a short code; the founder's link in a reply
 * points at their own site with ?ref=ms_<code> (never through a Mochiscout
 * redirect, which would get one shared domain banned on Reddit). A small
 * script on their site reports the visit, and their sign-up call reports the
 * conversion.
 */

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'
export const REF_PARAM = 'ref'
export const REF_PREFIX = 'ms_'

function randomCode(len = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

/** The project URL with this thread's ref parameter added. */
export function refLink(projectUrl: string, code: string) {
  const url = new URL(projectUrl)
  url.searchParams.set(REF_PARAM, `${REF_PREFIX}${code}`)
  return url.toString()
}

/** The thread's code, created on first use. */
export async function ensureRefCode(db: Db, projectId: string, threadId: string): Promise<string | null> {
  const s = schema.threadScores
  const row = await db.select({ code: s.refCode }).from(s).where(and(eq(s.projectId, projectId), eq(s.threadId, threadId))).get()
  if (!row) return null
  if (row.code) return row.code
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode()
    try {
      await db.update(s).set({ refCode: code }).where(and(eq(s.projectId, projectId), eq(s.threadId, threadId)))
      return code
    }
    catch { /* unique clash: try another */ }
  }
  return null
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase()
  }
  catch {
    return null
  }
}

/** Same site, allowing subdomains either way (app.example.com and example.com). */
export function sameSite(origin: string | null | undefined, projectUrl: string) {
  if (!origin) return true
  const a = hostOf(origin)
  const b = hostOf(projectUrl)
  if (!a || !b) return false
  if (a === 'localhost' || a === '127.0.0.1') return true
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)
}

/**
 * Count a visit or sign-up. Ignored unless the code belongs to the project
 * and the request comes from the project's own site.
 */
export async function recordRefEvent(db: Db, input: { projectId: string, code: string, event: 'visit' | 'signup', origin?: string | null, now?: Date }) {
  const code = input.code.toLowerCase()
  if (!/^[a-z0-9]{4,12}$/.test(code)) return false
  const row = await db.select({ projectId: schema.threadScores.projectId, url: schema.projects.url })
    .from(schema.threadScores)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.threadScores.projectId))
    .where(and(eq(schema.threadScores.refCode, code), eq(schema.threadScores.projectId, input.projectId)))
    .get()
  if (!row || !sameSite(input.origin, row.url)) return false
  const day = (input.now ?? new Date()).toISOString().slice(0, 10)
  const visits = input.event === 'visit' ? 1 : 0
  const signups = input.event === 'signup' ? 1 : 0
  await db.insert(schema.refStats).values({ code, day, projectId: row.projectId, visits, signups })
    .onConflictDoUpdate({
      target: [schema.refStats.code, schema.refStats.day],
      set: { visits: sql`${schema.refStats.visits} + ${visits}`, signups: sql`${schema.refStats.signups} + ${signups}` },
    })
  return true
}

/** Replies, their survival, and the visits and sign-ups they brought, over the last N days. */
export async function projectResults(db: Db, projectId: string, opts: { days?: number, now?: Date } = {}) {
  const now = opts.now ?? new Date()
  const days = opts.days ?? 30
  const since = new Date(now.getTime() - days * 86_400_000)
  const s = schema.threadScores
  const t = schema.threads
  const r = schema.refStats
  const [replies, perCode, perDay] = await Promise.all([
    db.select({
      threadId: t.id, title: t.title, url: t.url, platform: t.platform, channel: t.channel,
      repliedAt: s.statusChangedAt, replyUrl: s.replyUrl, replyStatus: s.replyStatus, refCode: s.refCode, intent: s.intent,
    }).from(s).innerJoin(t, eq(t.id, s.threadId))
      .where(and(eq(s.projectId, projectId), eq(s.status, 'replied'), gte(sql`coalesce(${s.statusChangedAt}, ${s.scoredAt})`, Math.floor(since.getTime() / 1000))))
      .orderBy(desc(sql`coalesce(${s.statusChangedAt}, ${s.scoredAt})`)),
    db.select({ code: r.code, visits: sql<number>`sum(${r.visits})`, signups: sql<number>`sum(${r.signups})` })
      .from(r).where(and(eq(r.projectId, projectId), gte(r.day, since.toISOString().slice(0, 10))))
      .groupBy(r.code),
    db.select({ day: r.day, visits: sql<number>`sum(${r.visits})`, signups: sql<number>`sum(${r.signups})` })
      .from(r).where(and(eq(r.projectId, projectId), gte(r.day, since.toISOString().slice(0, 10))))
      .groupBy(r.day),
  ])
  // One entry per day of the window (oldest first), zeros included, for charts.
  const dayMap = new Map(perDay.map(d => [d.day, { visits: Number(d.visits), signups: Number(d.signups) }]))
  const daily = Array.from({ length: days }, (_, i) => {
    const day = new Date(now.getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10)
    return { day, ...(dayMap.get(day) ?? { visits: 0, signups: 0 }) }
  })
  const byCode = new Map(perCode.map(c => [c.code, { visits: Number(c.visits), signups: Number(c.signups) }]))
  const rows = replies.map(x => ({ ...x, ...(x.refCode ? byCode.get(x.refCode) : undefined) ?? { visits: 0, signups: 0 } }))
  // Codes copied for threads not (yet) marked replied still count toward totals.
  const totals = perCode.reduce((a, c) => ({ visits: a.visits + Number(c.visits), signups: a.signups + Number(c.signups) }), { visits: 0, signups: 0 })
  const tracked = rows.filter(x => x.replyUrl)
  return {
    days,
    replied: rows.length,
    tracked: tracked.length,
    live: tracked.filter(x => x.replyStatus === 'live').length,
    removed: tracked.filter(x => x.replyStatus === 'removed').length,
    visits: totals.visits,
    signups: totals.signups,
    hasEvents: perCode.length > 0,
    daily,
    rows,
  }
}

/** Whether the project's tracking script has ever reported anything. */
export async function attributionInstalled(db: Db, projectId: string) {
  const row = await db.select({ code: schema.refStats.code }).from(schema.refStats).where(eq(schema.refStats.projectId, projectId)).limit(1).get()
  return !!row
}

