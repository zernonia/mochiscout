import type { JobContext } from '../jobs/context'
import type { Db } from '@mochiscout/db'
import { and, asc, count, desc, eq, gte, isNotNull, isNull, ne, or, schema, sql } from '@mochiscout/db'
import { HttpDeferredError, parseReplyUrl, readReplyThread } from '@mochiscout/sources'
import { alertWebhookKind, postAlertWebhook } from './alerts'
import { asksForDm } from './signals'

/** Replies are watched for this long after the founder marks them posted. */
export const REPLY_WATCH_DAYS = 14
/** Replies read per run: Reddit rate-limits bursts, and the job runs hourly. */
const WATCH_PER_RUN = 25
const REPLY_TEXT_MAX = 4000
const ITEMS_PER_ALERT = 5
const DAY_MS = 86_400_000

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]!)
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

export interface ResponseAlertItem {
  author: string | null
  text: string
  url: string
  threadTitle: string
  where: string
}

const who = (i: ResponseAlertItem) => i.author ?? 'Someone'

export function renderResponseAlert(appUrl: string, project: { id: string, name: string }, items: ResponseAlertItem[]) {
  const today = `${appUrl}/app/${project.id}/today`
  const n = items.length
  const subject = n === 1 ? `${who(items[0]!)} replied to you in ${items[0]!.where}` : `${n} new replies to your comments`
  const list = items.map(i => `<li style="margin:0 0 14px"><span style="color:#555;font-size:14px">${esc(who(i))} in ${esc(i.where)}, on "${esc(clip(i.threadTitle, 90))}"</span><br>${esc(clip(i.text, 280))}<br><a href="${esc(i.url)}" style="color:#111;font-size:14px">Open the reply →</a></li>`)
  return {
    subject,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111;line-height:1.45"><p style="margin:0 0 12px">${n === 1 ? 'Someone answered' : 'People answered'} a reply you posted for ${esc(project.name)}. Following up while it's fresh is the best chance to help.</p><ul style="padding-left:20px;margin:0">${list.join('')}</ul><p style="margin:12px 0 0"><a href="${esc(today)}" style="color:#111">Draft a response in Mochiscout →</a></p><p style="margin:32px 0 0;color:#888;font-size:12px">You reply yourself, from your own account.</p></div>`,
    text: `${items.map(i => `- ${who(i)} in ${i.where}: ${clip(i.text, 280)}\n  ${i.url}`).join('\n')}\n\nDraft a response: ${today}`,
  }
}

export function renderResponseWebhook(kind: 'slack' | 'discord', appUrl: string, project: { id: string, name: string }, items: ResponseAlertItem[]) {
  const today = `${appUrl}/app/${project.id}/today`
  const heading = `${items.length} new repl${items.length === 1 ? 'y' : 'ies'} to your comments (${project.name})`
  if (kind === 'slack') {
    const e = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const lines = items.map(i => `• ${e(who(i))} in ${e(i.where)}: <${i.url}|${e(clip(i.text, 140))}>`)
    return { text: `*${e(heading)}*\n${lines.join('\n')}\n<${today}|Draft a response →>`, unfurl_links: false }
  }
  const clean = (t: string) => t.replace(/[[\]]/g, '')
  const lines = items.map(i => `• ${clean(who(i))} in ${clean(i.where)}: [${clean(clip(i.text, 140))}](<${i.url}>)`)
  return { content: `**${heading}**\n${lines.join('\n')}\n[Draft a response →](<${today}>)`.slice(0, 2000), allowed_mentions: { parse: [] } }
}

/** Responses waiting for the founder, newest first, and how many posted replies are being watched. */
export async function pendingResponses(db: Db, projectId: string, opts: { limit?: number, now?: Date } = {}) {
  const now = opts.now ?? new Date()
  const rr = schema.replyResponses
  const s = schema.threadScores
  const [responses, [watching]] = await Promise.all([
    db.select({
      id: rr.id,
      threadId: rr.threadId,
      author: rr.author,
      body: rr.body,
      url: rr.url,
      postedAt: rr.postedAt,
      foundAt: rr.foundAt,
      followUp: rr.followUp,
      threadTitle: schema.threads.title,
      channel: schema.threads.channel,
      platform: schema.threads.platform,
      replyUrl: s.replyUrl,
    }).from(rr)
      .innerJoin(schema.threads, eq(schema.threads.id, rr.threadId))
      .innerJoin(s, and(eq(s.projectId, rr.projectId), eq(s.threadId, rr.threadId)))
      .where(and(eq(rr.projectId, projectId), eq(rr.status, 'new')))
      .orderBy(desc(rr.foundAt))
      .limit(opts.limit ?? 10),
    db.select({ n: count() }).from(s).where(and(
      eq(s.projectId, projectId),
      isNotNull(s.replyUrl),
      or(isNull(s.replyStatus), ne(s.replyStatus, 'removed')),
      gte(s.statusChangedAt, new Date(now.getTime() - REPLY_WATCH_DAYS * DAY_MS)),
    )),
  ])
  return { responses: responses.map(r => ({ ...r, asksForDm: asksForDm(r.body) })), watching: watching?.n ?? 0 }
}

/**
 * Cron (hourly): read the replies founders posted in the last two weeks and
 * store what people wrote under them, then tell the founder. Also refreshes
 * whether each reply is still up, and keeps its posted text for drafting a
 * follow-up.
 */
export async function runReplyWatch(ctx: JobContext) {
  const now = ctx.now()
  const s = schema.threadScores
  const rows = await ctx.db.select({ projectId: s.projectId, threadId: s.threadId, replyUrl: s.replyUrl }).from(s)
    .where(and(
      isNotNull(s.replyUrl),
      or(isNull(s.replyStatus), ne(s.replyStatus, 'removed')),
      gte(s.statusChangedAt, new Date(now.getTime() - REPLY_WATCH_DAYS * DAY_MS)),
    ))
    .orderBy(sql`${s.replyCheckedAt} is not null`, asc(s.replyCheckedAt))
    .limit(WATCH_PER_RUN)

  const result = { checked: 0, responses: 0, deferred: false, notified: 0 }
  try {
    for (const r of rows) {
      const ref = parseReplyUrl(r.replyUrl!)
      let state: Awaited<ReturnType<typeof readReplyThread>> | null = null
      try {
        if (ref) state = await readReplyThread(ctx.http, ref)
      }
      catch (error) {
        if (error instanceof HttpDeferredError) throw error
        ctx.log('reply watch failed', { thread: r.threadId, error: String(error) })
      }
      const statements = [
        ctx.db.update(s).set({
          replyStatus: state?.status ?? 'unknown',
          replyCheckedAt: now,
          ...(state?.text ? { replyText: clip(state.text, REPLY_TEXT_MAX) } : {}),
        }).where(and(eq(s.projectId, r.projectId), eq(s.threadId, r.threadId))),
        ...(state?.responses ?? []).map(x => ctx.db.insert(schema.replyResponses).values({
          projectId: r.projectId,
          threadId: r.threadId,
          id: x.id,
          author: x.author,
          body: x.text,
          url: x.url,
          postedAt: x.createdAt,
          foundAt: now,
        }).onConflictDoNothing()),
      ]
      await ctx.db.batch(statements as [typeof statements[number], ...typeof statements])
      result.checked++
      result.responses += state?.responses.length ?? 0
    }
  }
  catch (error) {
    if (!(error instanceof HttpDeferredError)) throw error
    result.deferred = true
  }
  result.notified = await notifyResponses(ctx, now)
  ctx.log('reply-watch', result)
  return result
}

/** One message per project about responses nobody was told about yet. */
async function notifyResponses(ctx: JobContext, now: Date) {
  if (!ctx.appUrl) return 0
  const rr = schema.replyResponses
  const pending = await ctx.db.select({ response: rr, project: schema.projects, title: schema.threads.title, channel: schema.threads.channel, platform: schema.threads.platform })
    .from(rr)
    .innerJoin(schema.projects, eq(schema.projects.id, rr.projectId))
    .innerJoin(schema.threads, eq(schema.threads.id, rr.threadId))
    .where(and(isNull(rr.notifiedAt), eq(rr.status, 'new')))
    .orderBy(asc(rr.foundAt))
    .limit(200)
  const byProject = new Map<string, typeof pending>()
  for (const p of pending) byProject.set(p.project.id, [...(byProject.get(p.project.id) ?? []), p])

  let sent = 0
  for (const rows of byProject.values()) {
    const project = rows[0]!.project
    const items: ResponseAlertItem[] = rows.slice(0, ITEMS_PER_ALERT).map(r => ({
      author: r.response.author,
      text: r.response.body,
      url: r.response.url,
      threadTitle: r.title,
      where: r.channel ? `r/${r.channel}` : r.platform === 'hn' ? 'Hacker News' : r.platform === 'bluesky' ? 'Bluesky' : r.platform,
    }))
    let delivered = false
    if (ctx.sendEmail) {
      const members = await ctx.db.select({ email: schema.users.email }).from(schema.orgMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.orgMembers.userId))
        .where(eq(schema.orgMembers.orgId, project.orgId))
      try {
        const email = renderResponseAlert(ctx.appUrl, project, items)
        for (const m of members) await ctx.sendEmail({ to: m.email, ...email })
        delivered = true
      }
      catch (error) {
        ctx.log('reply alert failed', { project: project.id, error: String(error) })
      }
    }
    const kind = project.alertWebhookUrl ? alertWebhookKind(project.alertWebhookUrl) : null
    if (kind) {
      try {
        await postAlertWebhook(project.alertWebhookUrl!, renderResponseWebhook(kind, ctx.appUrl, project, items))
        delivered = true
      }
      catch (error) {
        ctx.log('reply alert webhook failed', { project: project.id, error: String(error) })
      }
    }
    // With nowhere to send (no email set up, no webhook), they still show in the app; don't retry forever.
    if (!delivered && (ctx.sendEmail || kind)) continue
    if (delivered) sent++
    await ctx.db.update(schema.replyResponses).set({ notifiedAt: now })
      .where(and(eq(schema.replyResponses.projectId, project.id), isNull(schema.replyResponses.notifiedAt)))
  }
  return sent
}
