import type { JobContext } from '../jobs/context'
import type { TodayPlan } from './today'
import { desc, eq, schema } from '@mochiscout/db'
import { digestDueToday } from '../plans'
import { buildToday } from './today'
import type { WeeklySummary } from './weekly'
import { buildWeeklySummary } from './weekly'

export interface DigestEmail {
  to: string
  subject: string
  html: string
  text: string
}

/** Day of week (0 = Sunday) in a time zone. */
export function localWeekday(now: Date, timeZone: string): number {
  try {
    const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now)
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day)
  }
  catch {
    return now.getUTCDay()
  }
}

/** The hour (0-23) it is now in a time zone. */
export function localHour(now: Date, timeZone: string): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now)
    return Number.parseInt(hour, 10) % 24
  }
  catch {
    return now.getUTCHours()
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]!)

export function renderDigest(appUrl: string, sections: { project: { id: string, name: string }, plan: TodayPlan, week?: WeeklySummary }[]) {
  const html: string[] = []
  const text: string[] = []
  for (const { project, plan, week } of sections) {
    const todayUrl = `${appUrl}/app/${project.id}/today`
    html.push(`<h2 style="font-size:18px;margin:24px 0 8px">${esc(project.name)}</h2>`)
    text.push(`== ${project.name} ==`)
    if (week) {
      const line = `This week: ${week.worthAnswering} of ${week.scored} matching threads were worth answering; you replied to ${week.replied}. ${week.posts} post${week.posts === 1 ? '' : 's'} tracked${week.removed ? `, ${week.removed} removed or hidden` : ''}.`
      html.push(`<p style="margin:0 0 8px;padding:10px 12px;background:#f5f5f5;border-radius:8px">${esc(line)}${week.painPoints.length ? `<br><span style="color:#555;font-size:14px">Top pain points: ${week.painPoints.map(p => esc(p.title)).join(' · ')}</span>` : ''}</p>`)
      text.push(line, ...(week.painPoints.length ? [`Top pain points: ${week.painPoints.map(p => p.title).join(' · ')}`] : []))
    }
    if (plan.threads.length) {
      html.push(`<p style="margin:0 0 8px;color:#555">${plan.newCount} thread${plan.newCount === 1 ? '' : 's'} worth answering. Top ${plan.threads.length}:</p><ol style="padding-left:20px;margin:0">`)
      for (const t of plan.threads) {
        html.push(`<li style="margin:0 0 12px"><a href="${esc(t.url)}" style="color:#111;font-weight:600">${esc(t.title)}</a><br><span style="color:#555;font-size:14px">${t.channel ? `r/${esc(t.channel)} · ` : ''}intent ${t.intent}${t.replyAngle ? ` · ${esc(t.replyAngle)}` : ''}</span></li>`)
        text.push(`- [${t.intent}] ${t.title}\n  ${t.url}${t.replyAngle ? `\n  Reply angle: ${t.replyAngle}` : ''}`)
      }
      html.push('</ol>')
    }
    if (plan.suggestion) {
      const s = plan.suggestion
      const line = `Post idea: a ${s.angle}${s.topic ? ` about "${s.topic}"` : ''} in r/${s.subreddit}${s.promo ? '' : ' (no product mention)'}.`
      html.push(`<p style="margin:12px 0 0">${esc(line)}<br><span style="color:#555;font-size:14px">${esc(s.why)}</span></p>`)
      text.push(line)
    }
    html.push(`<p style="margin:12px 0 0"><a href="${esc(todayUrl)}" style="color:#111">Open today's plan →</a></p>`)
    text.push(`Today's plan: ${todayUrl}`, '')
  }
  return {
    subject: sections.some(s => s.week) ? 'Your Mochiscout week, and today\'s plan' : 'Your Mochiscout plan for today',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111;line-height:1.45">${html.join('')}<p style="margin:32px 0 0;color:#888;font-size:12px">You post and reply yourself. Change the digest time or turn it off in <a href="${esc(appUrl)}/app/settings" style="color:#888">Settings</a>.</p></div>`,
    text: `${text.join('\n')}\nSettings: ${appUrl}/app/settings`,
  }
}

/** Hourly: send each user their digest when it is their digest hour locally, at most once a day. */
export async function runDigest(ctx: JobContext) {
  if (!ctx.sendEmail || !ctx.appUrl) return { skipped: 'no email sender or app URL' }
  const appUrl = ctx.appUrl
  const now = ctx.now()
  const users = await ctx.db.select().from(schema.users)
  let sent = 0
  for (const user of users) {
    if (user.digestHour < 0 || localHour(now, user.timezone) !== user.digestHour) continue
    if (user.lastDigestAt && now.getTime() - user.lastDigestAt.getTime() < 20 * 3_600_000) continue

    const membership = await ctx.db.select({ org: schema.orgs }).from(schema.orgMembers)
      .innerJoin(schema.orgs, eq(schema.orgs.id, schema.orgMembers.orgId))
      .where(eq(schema.orgMembers.userId, user.id))
      .orderBy(desc(schema.orgMembers.createdAt))
      .get()
    const org = membership?.org
    if (!org || !digestDueToday(org.plan, localWeekday(now, user.timezone))) continue
    const projects = await ctx.db.select().from(schema.projects).where(eq(schema.projects.orgId, org.id))
    const sections = []
    const monday = localWeekday(now, user.timezone) === 1
    for (const project of projects) {
      const plan = await buildToday(ctx.db, project, now)
      const week = monday ? await buildWeeklySummary(ctx.db, project, now) : undefined
      if (plan.threads.length || plan.suggestion || (week && week.scored)) sections.push({ project, plan, week })
    }
    if (!sections.length) continue

    const email = renderDigest(appUrl, sections)
    try {
      await ctx.sendEmail({ to: user.email, ...email })
      await ctx.db.update(schema.users).set({ lastDigestAt: now }).where(eq(schema.users.id, user.id))
      sent++
    }
    catch (error) {
      ctx.log('digest failed', { user: user.id, error: String(error) })
    }
  }
  ctx.log('digest', { sent })
  return { sent }
}
