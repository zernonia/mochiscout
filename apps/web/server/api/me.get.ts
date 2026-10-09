import { limitsFor, watchedSubredditCount } from '@mochiscout/core'
import { and, count, eq, schema } from '@mochiscout/db'

/** The signed-in user, their org, plan limits and this month's usage. */
export default defineEventHandler(async (event) => {
  const { user, org, role } = await requireUser(event)
  const db = getDb(event)
  const period = new Date().toISOString().slice(0, 7)
  const [[projects], watched, usage] = await Promise.all([
    db.select({ n: count() }).from(schema.projects).where(eq(schema.projects.orgId, org.id)),
    watchedSubredditCount(db, org.id),
    db.select().from(schema.usage).where(and(eq(schema.usage.orgId, org.id), eq(schema.usage.period, period))).get(),
  ])
  const limits = limitsFor(org.plan)
  const finite = (n: number) => (Number.isFinite(n) ? n : null)
  return {
    user,
    role,
    edition: useRuntimeConfig(event).public.edition,
    org: { id: org.id, plan: org.plan, planStatus: org.planStatus, currentPeriodEnd: org.currentPeriodEnd },
    limits: {
      label: limits.label,
      projects: finite(limits.projects),
      watchedSubreddits: finite(limits.watchedSubreddits),
      seats: finite(limits.seats),
      manualResearchPerMonth: finite(limits.manualResearchPerMonth),
      digest: limits.digest,
      mcp: limits.mcp,
    },
    usage: {
      projects: projects?.n ?? 0,
      watchedSubreddits: watched,
      researchRuns: usage?.researchRuns ?? 0,
      searches: usage?.searches ?? 0,
      llmInputTokens: usage?.llmInputTokens ?? 0,
      llmOutputTokens: usage?.llmOutputTokens ?? 0,
    },
  }
})
