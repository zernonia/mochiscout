import type { Db } from '@social-radar/db'
import type { Platform } from '@social-radar/sources'
import { and, count, eq, inArray, schema, sql } from '@social-radar/db'

export type Plan = 'selfhost' | 'free' | 'solo' | 'pro'

export interface PlanLimits {
  label: string
  /** USD per month (display only; Polar holds the real price). */
  price: number | null
  projects: number
  watchedSubreddits: number
  seats: number
  digest: 'daily' | 'weekly'
  /** Automatic research re-run interval in days, or null for none. */
  researchEveryDays: number | null
  /** Research runs a month started by hand. */
  manualResearchPerMonth: number
  mcp: boolean
  sources: Platform[]
}

const ALL_SOURCES: Platform[] = ['reddit', 'hn', 'bluesky', 'x', 'web']

/** Plans from docs/arch.md §10. Self-host has no limits. */
export const PLANS: Record<Plan, PlanLimits> = {
  selfhost: { label: 'Self-host', price: null, projects: Infinity, watchedSubreddits: Infinity, seats: Infinity, digest: 'daily', researchEveryDays: 7, manualResearchPerMonth: Infinity, mcp: true, sources: ALL_SOURCES },
  free: { label: 'Free', price: 0, projects: 1, watchedSubreddits: 3, seats: 1, digest: 'weekly', researchEveryDays: null, manualResearchPerMonth: 1, mcp: false, sources: ['reddit'] },
  solo: { label: 'Solo', price: 19, projects: 1, watchedSubreddits: 15, seats: 1, digest: 'daily', researchEveryDays: 30, manualResearchPerMonth: 2, mcp: false, sources: ['reddit', 'hn', 'bluesky'] },
  pro: { label: 'Pro', price: 49, projects: 5, watchedSubreddits: 50, seats: 3, digest: 'daily', researchEveryDays: 7, manualResearchPerMonth: 8, mcp: true, sources: ALL_SOURCES },
}

export type QuotaFeature = 'projects' | 'watchedSubreddits' | 'seats' | 'research' | 'mcp' | 'source'

/** A plan limit was hit. The API turns this into HTTP 402 with an upgrade payload. */
export class QuotaError extends Error {
  constructor(
    readonly feature: QuotaFeature,
    readonly plan: Plan,
    readonly limit: number | boolean,
    message: string,
    private readonly upgradeOverride?: Plan | null,
  ) {
    super(message)
    this.name = 'QuotaError'
  }

  /** The cheapest plan that lifts this limit. */
  get upgradeTo(): Plan | null {
    if (this.upgradeOverride !== undefined) return this.upgradeOverride
    return (['solo', 'pro'] as const).find(p => PLANS[p].price! > (PLANS[this.plan].price ?? 0) && lifts(p, this.feature, this.limit)) ?? null
  }
}

function lifts(plan: Plan, feature: QuotaFeature, current: number | boolean) {
  const l = PLANS[plan]
  switch (feature) {
    case 'projects': return l.projects > Number(current)
    case 'watchedSubreddits': return l.watchedSubreddits > Number(current)
    case 'seats': return l.seats > Number(current)
    case 'research': return l.manualResearchPerMonth > Number(current)
    case 'mcp': return l.mcp
    case 'source': return true
  }
}

export function limitsFor(plan: Plan) {
  return PLANS[plan]
}

interface Org { id: string, plan: Plan }

export async function assertCanCreateProject(db: Db, org: Org) {
  const limit = PLANS[org.plan].projects
  if (limit === Infinity) return
  const [row] = await db.select({ n: count() }).from(schema.projects).where(eq(schema.projects.orgId, org.id))
  if ((row?.n ?? 0) >= limit) {
    throw new QuotaError('projects', org.plan, limit, `The ${PLANS[org.plan].label} plan includes ${limit} project${limit === 1 ? '' : 's'}.`)
  }
}

/** Distinct subreddits watched across all of the org's projects. */
export async function watchedSubredditCount(db: Db, orgId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${schema.projectSubreddits.subreddit})` })
    .from(schema.projectSubreddits)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.projectSubreddits.projectId))
    .where(and(eq(schema.projects.orgId, orgId), eq(schema.projectSubreddits.watching, true)))
  return Number(row?.n ?? 0)
}

export async function assertCanWatch(db: Db, org: Org, subreddit: string) {
  const limit = PLANS[org.plan].watchedSubreddits
  if (limit === Infinity) return
  const projectIds = db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.orgId, org.id))
  const already = await db.select({ s: schema.projectSubreddits.subreddit }).from(schema.projectSubreddits)
    .where(and(
      inArray(schema.projectSubreddits.projectId, projectIds),
      eq(schema.projectSubreddits.subreddit, subreddit),
      eq(schema.projectSubreddits.watching, true),
    )).get()
  if (already) return
  if (await watchedSubredditCount(db, org.id) >= limit) {
    throw new QuotaError('watchedSubreddits', org.plan, limit, `The ${PLANS[org.plan].label} plan watches up to ${limit} subreddits.`)
  }
}

export async function assertCanRunResearch(db: Db, org: Org, now = new Date()) {
  const limit = PLANS[org.plan].manualResearchPerMonth
  if (limit === Infinity) return
  const usage = await db.select({ runs: schema.usage.researchRuns }).from(schema.usage)
    .where(and(eq(schema.usage.orgId, org.id), eq(schema.usage.period, now.toISOString().slice(0, 7)))).get()
  if ((usage?.runs ?? 0) >= limit) {
    throw new QuotaError('research', org.plan, limit, `The ${PLANS[org.plan].label} plan includes ${limit} research run${limit === 1 ? '' : 's'} a month.`)
  }
}

export async function assertCanAddSeat(db: Db, org: Org) {
  const limit = PLANS[org.plan].seats
  if (limit === Infinity) return
  const [members] = await db.select({ n: count() }).from(schema.orgMembers).where(eq(schema.orgMembers.orgId, org.id))
  const [invites] = await db.select({ n: count() }).from(schema.orgInvites).where(eq(schema.orgInvites.orgId, org.id))
  if ((members?.n ?? 0) + (invites?.n ?? 0) >= limit) {
    throw new QuotaError('seats', org.plan, limit, `The ${PLANS[org.plan].label} plan includes ${limit} seat${limit === 1 ? '' : 's'}.`)
  }
}

/** Feed sources the plan includes; asking for others is a quota error. */
export function assertSources(org: Org, sources: Platform[]) {
  const missing = sources.filter(s => !PLANS[org.plan].sources.includes(s))
  if (!missing.length) return
  const to = (['solo', 'pro'] as const).find(p => missing.every(s => PLANS[p].sources.includes(s))) ?? null
  const names: Record<string, string> = { hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web', reddit: 'Reddit' }
  throw new QuotaError('source', org.plan, false, `${missing.map(s => names[s]).join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not part of the ${PLANS[org.plan].label} plan.`, to)
}

export function assertMcp(org: Org) {
  if (!PLANS[org.plan].mcp) throw new QuotaError('mcp', org.plan, false, 'The MCP server is part of the Pro plan.')
}

/** Weekly digests go out on Mondays (user's local date). */
export function digestDueToday(plan: Plan, localWeekday: number) {
  return PLANS[plan].digest === 'daily' || localWeekday === 1
}
