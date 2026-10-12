import type { JobContext } from './jobs/context'
import { and, asc, desc, eq, gte, isNull, lte, schema, sql } from '@mochiscout/db'
import { PLANS } from './plans'

/**
 * Reverse trial: new hosted orgs start on Pro for 14 days without a card,
 * then drop to Free unless they buy a plan. The trial is plan 'pro' with
 * plan_status 'trialing' and no Polar subscription; buying one replaces it.
 */
export const TRIAL_DAYS = 14
export const TRIAL_PLAN = 'pro' as const
/** AI drafts during the trial: enough to try everything, capped so a trial costs a few dollars at most. */
export const TRIAL_DRAFTS = 150
/** The "ending soon" email goes out this many days before the end. */
export const TRIAL_REMIND_DAYS = 3
const DAY_MS = 86_400_000

interface TrialFields { planStatus?: string | null, polarSubscriptionId?: string | null }

/** On the free trial (not a paid Polar trial or subscription). */
export function isAppTrial(org: TrialFields): boolean {
  return org.planStatus === 'trialing' && !org.polarSubscriptionId
}

export function trialStart(now: Date) {
  return { plan: TRIAL_PLAN, planStatus: 'trialing', trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS) }
}

/** Whole days left, rounded up (0 once it has ended). */
export function trialDaysLeft(endsAt: Date | null | undefined, now: Date): number {
  if (!endsAt) return 0
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS))
}

export interface TrialEmail { subject: string, html: string, text: string }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function renderTrialEmail(kind: 'ending' | 'ended', appUrl: string, info: { name: string | null, leads: number, daysLeft: number }): TrialEmail {
  const billing = `${appUrl}/app/billing`
  const hi = info.name ? `Hi ${info.name.split(' ')[0]},` : 'Hi,'
  const found = info.leads
    ? `So far Mochiscout has found ${info.leads} thread${info.leads === 1 ? '' : 's'} where people ask for what you sell.`
    : 'Mochiscout keeps checking for people asking for what you sell.'
  const lines = kind === 'ending'
    ? [
        hi,
        `Your Pro trial ends in ${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'}. ${found}`,
        'After the trial you move to the Free plan: 1 project, 3 subreddits, Reddit only, a weekly digest and no automatic drafts or hot lead alerts. Pick Solo or Pro to keep them.',
      ]
    : [
        hi,
        `Your Pro trial has ended and your account is on the Free plan now. ${found}`,
        'We kept your top 3 subreddits running. Upgrade any time to bring back the rest, Hacker News and Bluesky, daily digests, hot lead alerts and automatic drafts.',
      ]
  const cta = kind === 'ending' ? 'Choose a plan' : 'See plans'
  return {
    subject: kind === 'ending' ? `Your Mochiscout Pro trial ends in ${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'}` : 'Your Mochiscout Pro trial has ended',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111;line-height:1.5">${lines.map(l => `<p style="margin:0 0 12px">${esc(l)}</p>`).join('')}<p style="margin:16px 0 0"><a href="${esc(billing)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none">${cta}</a></p><p style="margin:32px 0 0;color:#888;font-size:12px">Questions? Just reply to this email.</p></div>`,
    text: `${lines.join('\n\n')}\n\n${cta}: ${billing}`,
  }
}

/** Threads at or above each project's intent threshold, for the org's projects. */
async function leadsFound(ctx: JobContext, orgId: string) {
  const [row] = await ctx.db.select({ n: sql<number>`count(*)` }).from(schema.threadScores)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.threadScores.projectId))
    .where(and(eq(schema.projects.orgId, orgId), gte(schema.threadScores.intent, schema.projects.intentThreshold)))
  return Number(row?.n ?? 0)
}

/**
 * On the free plan's limits again, keep the subreddits that matter most
 * watched (oldest project first, best fit first) and pause the rest, so
 * an expired trial doesn't keep paying for scoring 50 subreddits.
 */
async function trimToFree(ctx: JobContext, orgId: string) {
  const limit = PLANS.free.watchedSubreddits
  const rows = await ctx.db.select({ projectId: schema.projectSubreddits.projectId, subreddit: schema.projectSubreddits.subreddit })
    .from(schema.projectSubreddits)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.projectSubreddits.projectId))
    .where(and(eq(schema.projects.orgId, orgId), eq(schema.projectSubreddits.watching, true)))
    .orderBy(asc(schema.projects.createdAt), desc(sql`coalesce(${schema.projectSubreddits.fitScore}, 0)`))
  const keep = new Set<string>()
  const pause: { projectId: string, subreddit: string }[] = []
  for (const r of rows) {
    if (keep.has(r.subreddit) || keep.size < limit) keep.add(r.subreddit)
    else pause.push(r)
  }
  for (const p of pause) {
    await ctx.db.update(schema.projectSubreddits).set({ watching: false })
      .where(and(eq(schema.projectSubreddits.projectId, p.projectId), eq(schema.projectSubreddits.subreddit, p.subreddit)))
  }
  return pause.length
}

/** Hourly: end expired trials (Free plan, trimmed) and email trials that end soon. */
export async function runTrials(ctx: JobContext) {
  const now = ctx.now()
  const o = schema.orgs
  const trialing = and(eq(o.planStatus, 'trialing'), isNull(o.polarSubscriptionId))
  const result = { ended: 0, reminded: 0, paused: 0 }

  const owner = async (orgId: string) => ctx.db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(o).innerJoin(schema.users, eq(schema.users.id, o.ownerId)).where(eq(o.id, orgId)).get()

  const expired = await ctx.db.select({ id: o.id, trialEmails: o.trialEmails }).from(o)
    .where(and(trialing, lte(o.trialEndsAt, now)))
  for (const org of expired) {
    await ctx.db.update(o).set({ plan: 'free', planStatus: 'trial_ended' }).where(and(eq(o.id, org.id), trialing))
    result.paused += await trimToFree(ctx, org.id)
    result.ended++
    const user = await owner(org.id)
    if (!user) continue
    await ctx.track?.(user.id, 'trial_expired', { org_id: org.id })
    if (ctx.sendEmail && ctx.appUrl && org.trialEmails < 2) {
      const email = renderTrialEmail('ended', ctx.appUrl, { name: user.name, leads: await leadsFound(ctx, org.id), daysLeft: 0 })
      await ctx.sendEmail({ to: user.email, ...email })
      await ctx.db.update(o).set({ trialEmails: 2 }).where(eq(o.id, org.id))
    }
  }

  if (ctx.sendEmail && ctx.appUrl) {
    const soon = await ctx.db.select({ id: o.id, endsAt: o.trialEndsAt }).from(o)
      .where(and(trialing, eq(o.trialEmails, 0), lte(o.trialEndsAt, new Date(now.getTime() + TRIAL_REMIND_DAYS * DAY_MS))))
    for (const org of soon) {
      const user = await owner(org.id)
      if (!user) continue
      const email = renderTrialEmail('ending', ctx.appUrl, { name: user.name, leads: await leadsFound(ctx, org.id), daysLeft: trialDaysLeft(org.endsAt, now) })
      await ctx.sendEmail({ to: user.email, ...email })
      await ctx.db.update(o).set({ trialEmails: 1 }).where(eq(o.id, org.id))
      result.reminded++
    }
  }
  if (result.ended || result.reminded) ctx.log('trials', result)
  return result
}
