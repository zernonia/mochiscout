import type { JobContext } from '../jobs/context'
import { and, desc, eq, gte, inArray, isNull, lt, or, schema } from '@mochiscout/db'
import { PLANS } from '../plans'
import { assessLead, HOT_MIN_INTENT } from './assess'

/** At most one alert email per project in this window; later hot leads wait for the next one. */
const ALERT_GAP_MS = 60 * 60_000
const LEADS_PER_EMAIL = 5

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]!)

export interface HotLead {
  title: string
  url: string
  channel: string | null
  platform: string
  ageHours: number | null
  commentCount: number | null
  replyAngle: string | null
  drafted: boolean
}

const PLATFORM: Record<string, string> = { reddit: 'Reddit', hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web' }

function where(l: HotLead) {
  const parts = [l.channel ? `r/${l.channel}` : PLATFORM[l.platform] ?? l.platform]
  if (l.ageHours !== null) parts.push(l.ageHours < 1 ? 'just now' : `${Math.round(l.ageHours)}h ago`)
  if (l.commentCount !== null) parts.push(`${l.commentCount} repl${l.commentCount === 1 ? 'y' : 'ies'}`)
  return parts.join(' · ')
}

export function renderHotAlert(appUrl: string, project: { id: string, name: string }, leads: HotLead[]) {
  const inbox = `${appUrl}/app/${project.id}/inbox`
  const n = leads.length
  const subject = n === 1 ? `Hot lead for ${project.name}: ${leads[0]!.title}` : `${n} hot leads for ${project.name}`
  const items = leads.map(l => `<li style="margin:0 0 14px"><a href="${esc(l.url)}" style="color:#111;font-weight:600">${esc(l.title)}</a><br><span style="color:#555;font-size:14px">${esc(where(l))}${l.drafted ? ' · reply drafted' : ''}</span>${l.replyAngle ? `<br><span style="color:#555;font-size:14px">${esc(l.replyAngle)}</span>` : ''}</li>`)
  return {
    subject,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111;line-height:1.45"><p style="margin:0 0 12px">${n === 1 ? 'Someone is' : 'People are'} asking for what ${esc(project.name)} does, and ${n === 1 ? 'the thread is' : 'the threads are'} still fresh. Early replies get seen.</p><ol style="padding-left:20px;margin:0">${items.join('')}</ol><p style="margin:12px 0 0"><a href="${esc(inbox)}" style="color:#111">Open your inbox →</a></p><p style="margin:32px 0 0;color:#888;font-size:12px">You reply yourself. Turn hot lead alerts off in the inbox.</p></div>`,
    text: `${leads.map(l => `- ${l.title}\n  ${where(l)}${l.drafted ? ' · reply drafted' : ''}\n  ${l.url}`).join('\n')}\n\nInbox: ${inbox}`,
  }
}

/** Cron: email a project's members when new hot leads appear (paid plans; at most hourly per project). */
export async function runHotAlerts(ctx: JobContext) {
  if (!ctx.sendEmail || !ctx.appUrl) return { skipped: 'no email sender or app URL' }
  const now = ctx.now()
  const plans = Object.entries(PLANS).filter(([, l]) => l.hotAlerts).map(([p]) => p as keyof typeof PLANS)
  const projects = await ctx.db.select({ project: schema.projects }).from(schema.projects)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.projects.orgId))
    .where(and(
      eq(schema.projects.hotAlerts, true),
      inArray(schema.orgs.plan, plans),
      or(isNull(schema.projects.lastHotAlertAt), lt(schema.projects.lastHotAlertAt, new Date(now.getTime() - ALERT_GAP_MS))),
    ))

  let sent = 0
  for (const { project } of projects) {
    const rows = await ctx.db
      .select({ thread: schema.threads, intent: schema.threadScores.intent, replyAngle: schema.threadScores.replyAngle, replyDraft: schema.threadScores.replyDraft })
      .from(schema.threadScores)
      .innerJoin(schema.threads, eq(schema.threads.id, schema.threadScores.threadId))
      .where(and(
        eq(schema.threadScores.projectId, project.id),
        eq(schema.threadScores.status, 'new'),
        gte(schema.threadScores.intent, Math.max(project.intentThreshold, HOT_MIN_INTENT)),
        eq(schema.threads.state, 'open'),
        isNull(schema.threadScores.alertedAt),
      ))
      .orderBy(desc(schema.threadScores.intent))
      .limit(20)
    const hot = rows
      .map(r => ({ r, lead: assessLead({ ...r.thread, intent: r.intent }, project.competitors, now) }))
      .filter(x => x.lead.hot)
      .sort((a, b) => b.lead.opportunity - a.lead.opportunity)
    if (!hot.length) continue

    const members = await ctx.db.select({ email: schema.users.email }).from(schema.orgMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMembers.userId))
      .where(eq(schema.orgMembers.orgId, project.orgId))
    const email = renderHotAlert(ctx.appUrl, project, hot.slice(0, LEADS_PER_EMAIL).map(({ r, lead }) => ({
      title: r.thread.title,
      url: r.thread.url,
      channel: r.thread.channel,
      platform: r.thread.platform,
      ageHours: lead.ageHours,
      commentCount: lead.commentCount,
      replyAngle: r.replyAngle,
      drafted: !!r.replyDraft,
    })))
    try {
      for (const m of members) await ctx.sendEmail({ to: m.email, ...email })
      sent++
    }
    catch (error) {
      ctx.log('hot alert failed', { project: project.id, error: String(error) })
      continue
    }
    // Everything hot now counts as alerted, including leads past the email's top 5.
    const statements = [
      ctx.db.update(schema.projects).set({ lastHotAlertAt: now }).where(eq(schema.projects.id, project.id)),
      ...hot.map(({ r }) => ctx.db.update(schema.threadScores).set({ alertedAt: now })
        .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, r.thread.id)))),
    ]
    await ctx.db.batch(statements as [typeof statements[number], ...typeof statements])
  }
  ctx.log('hot-alerts', { projects: projects.length, sent })
  return { projects: projects.length, sent }
}
