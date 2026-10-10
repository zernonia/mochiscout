import type { Db } from '@mochiscout/db'
import type { Llm, Tier } from '@mochiscout/llm'
import type { SubredditRules } from '@mochiscout/rules'
import type { Http, ThreadComment, ThreadState } from '@mochiscout/sources'
import type { JobContext } from '../jobs/context'
import type { DraftProject } from './generate'
import { and, desc, eq, gte, inArray, isNull, schema } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { getRules } from '@mochiscout/rules'
import { assessLead, HOT_MIN_INTENT, isClosed } from '../leads/assess'
import { refreshThreadContext } from '../leads/context'
import { voiceExamples } from '../leads/learning'
import { resolveRules } from '../subreddits/rules'
import { PLANS } from '../plans'
import { recordUsage } from '../usage'
import { rulesBrief } from './generate'

export const ReplyDraft = z.object({
  reply: z.string().describe('The reply text, ready to paste. Reddit markdown is fine for Reddit; plain text elsewhere.'),
  mentions_product: z.boolean().describe('Whether the reply mentions the founder\'s product'),
})

export interface ReplyThread {
  platform: string
  channel: string | null
  title: string
  snippet: string | null
  kind: string
  reason: string | null
  replyAngle: string | null
  /** Full post text, when fetched. */
  body?: string | null
  /** Top replies so far, when fetched. */
  comments?: ThreadComment[] | null
  /** Competitors already recommended in the replies. */
  competitorMentions?: string[]
}

/** The thread can't be answered any more (archived, locked, removed or deleted). */
export class ThreadClosedError extends Error {
  constructor(readonly state: ThreadState) {
    super(CLOSED_MESSAGE[state] ?? 'This thread is closed to new replies.')
    this.name = 'ThreadClosedError'
  }
}

const CLOSED_MESSAGE: Partial<Record<ThreadState, string>> = {
  archived: 'This thread is archived, so it no longer accepts replies.',
  locked: 'This thread is locked, so it no longer accepts replies.',
  removed: 'This post was removed, so there is nothing to reply to.',
  deleted: 'This post was deleted, so there is nothing to reply to.',
}

const PLATFORM_STYLE: Record<string, string> = {
  reddit: 'Reddit comment: conversational, 40-150 words, short paragraphs. Markdown is fine.',
  hn: 'Hacker News comment: plain, technical and understated, 40-150 words. No marketing language at all; HN readers punish it.',
  bluesky: 'Bluesky reply: under 300 characters, friendly and direct.',
  x: 'X reply: under 280 characters, direct, no hashtags.',
  web: 'Forum or blog comment: conversational, 40-150 words.',
}

/** Draft a helpful reply to a thread for the founder to review, edit and post themselves. */
export async function generateReply(llm: Llm, opts: { project: DraftProject, thread: ReplyThread, tier: Tier, voice?: string[], rules?: SubredditRules | null }) {
  const { project, thread } = opts
  const rules = opts.rules !== undefined
    ? opts.rules
    : thread.platform === 'reddit' && thread.channel ? getRules(thread.channel) ?? null : null
  const asksForTool = thread.kind === 'seeking_tool' || thread.kind === 'comparison'
  const system = `You help a founder reply to an online thread. They will review, edit and post the reply themselves from their own account.

Write as the founder, in the first person. Lead with a genuinely useful answer to what the person asked or is struggling with: specific advice, trade-offs, what worked for others. It must be worth reading even if the product were never mentioned.

${asksForTool
    ? `The person is looking for a tool, so mentioning ${project.name} is welcome if it truly fits: at most once, with honest disclosure ("I built ${project.name}" or "I'm working on ${project.name}"), alongside fair mention of other options where relevant.`
    : `The person is not asking for a tool. Do not mention ${project.name} unless it is directly and obviously useful; when in doubt, leave it out and just help.`}

Read the replies already posted: don't repeat advice someone already gave; add what is missing, or briefly build on the best answer. If a competitor was already recommended, be fair about it and say plainly when ${project.name} differs.

Never invent facts, numbers, features or customer stories. Where a specific detail is needed and unknown, write a placeholder like [your experience here]. No links. No emoji, hashtags, hype or sign-offs.

Style: ${PLATFORM_STYLE[thread.platform] ?? PLATFORM_STYLE.web}${rules ? `\n\n${rulesBrief(thread.channel!, rules)}` : ''}${opts.voice?.length
    ? `\n\nReplies the founder wrote and posted before. Match their voice, tone, length and formatting habits; never reuse their content:\n${opts.voice.map(v => `<example>\n${v}\n</example>`).join('\n')}`
    : ''}`

  const prompt = [
    `Thread${thread.channel ? ` in r/${thread.channel}` : ` on ${thread.platform}`}:`,
    `<thread>`,
    `Title: ${thread.title}`,
    thread.body ? `\n${thread.body}` : thread.snippet ? `\n${thread.snippet}` : '',
    `</thread>`,
    thread.comments?.length
      ? `\nReplies so far (top ${thread.comments.length}):\n<replies>\n${thread.comments.map(c => `- ${c.author ?? 'someone'}: ${c.text}`).join('\n')}\n</replies>`
      : '',
    thread.competitorMentions?.length ? `Competitors already mentioned in the replies: ${thread.competitorMentions.join(', ')}` : '',
    '',
    `Why it matters to the founder: ${thread.reason ?? 'n/a'}`,
    thread.replyAngle ? `Suggested angle: ${thread.replyAngle}` : '',
    '',
    `The founder's product: ${project.name}${project.category ? ` (${project.category})` : ''}.`,
    project.icp ? `Who it is for: ${project.icp}` : '',
    project.problems.length ? `Problems it solves: ${project.problems.join('; ')}` : '',
  ].filter(line => line !== '').join('\n')

  return llm.generate({ tier: opts.tier, system, prompt, schema: ReplyDraft, maxTokens: 3000 })
}

/**
 * Draft (or redraft) the reply for one scored thread and store it. With an
 * HTTP client, the thread's full text, replies and state are refreshed first;
 * a thread nobody can reply to throws ThreadClosedError instead of spending a
 * draft on it.
 */
export async function draftReplyForThread(db: Db, llm: Llm, project: typeof schema.projects.$inferSelect, threadId: string, opts: { tier?: Tier, http?: Http, now?: Date } = {}) {
  const now = opts.now ?? new Date()
  const score = await db
    .select({ kind: schema.threadScores.kind, intent: schema.threadScores.intent, reason: schema.threadScores.reason, replyAngle: schema.threadScores.replyAngle })
    .from(schema.threadScores)
    .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId)))
    .get()
  if (!score) return null
  const thread = opts.http
    ? await refreshThreadContext(db, opts.http, threadId, { now })
    : await db.select().from(schema.threads).where(eq(schema.threads.id, threadId)).get()
  if (!thread) return null

  const lead = assessLead({ ...thread, intent: score.intent }, project.competitors, now)
  if (isClosed(lead.state)) throw new ThreadClosedError(lead.state)

  const [voice, resolved] = await Promise.all([
    voiceExamples(db, project.id),
    thread.platform === 'reddit' && thread.channel ? resolveRules(db, thread.channel) : Promise.resolve({ rules: null }),
  ])
  const { data, usage } = await generateReply(llm, {
    project,
    thread: { ...thread, ...score, competitorMentions: lead.competitorMentions },
    tier: opts.tier ?? 'quality',
    voice,
    rules: resolved.rules,
  })
  const reply = data.reply.trim()
  await Promise.all([
    db.update(schema.threadScores)
      .set({ replyDraft: reply, replyAiDraft: reply, replyDraftedAt: now })
      .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId))),
    recordUsage(db, project.orgId, { llmInputTokens: usage.inputTokens, llmOutputTokens: usage.outputTokens }),
  ])
  return { replyDraft: reply, replyDraftedAt: now }
}

/** Replies drafted per cron tick across all projects (bounded LLM spend and Worker time). */
const AUTO_REPLY_PER_RUN = 10
/** Candidates looked at per project per run. */
const AUTO_REPLY_SCAN = 20

/**
 * Cron: draft replies for hot leads in projects that turned on auto-replies.
 * Only open, fresh, high-intent threads get one (Sonnet-class model): drafting
 * every thread wastes money on ones the founder will dismiss. Projects take
 * turns so one busy project can't use up the run.
 */
export async function runAutoReplies(ctx: JobContext) {
  if (!ctx.llm) return { skipped: 'no LLM configured' }
  const now = ctx.now()
  const plans = Object.entries(PLANS).filter(([, l]) => l.autoReplies).map(([p]) => p as keyof typeof PLANS)
  const projects = await ctx.db
    .select({ project: schema.projects })
    .from(schema.projects)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.projects.orgId))
    .where(and(eq(schema.projects.autoReply, true), inArray(schema.orgs.plan, plans)))

  const queues = await Promise.all(projects.map(async ({ project }) => {
    const rows = await ctx.db
      .select({ thread: schema.threads, intent: schema.threadScores.intent, kind: schema.threadScores.kind })
      .from(schema.threadScores)
      .innerJoin(schema.threads, eq(schema.threads.id, schema.threadScores.threadId))
      .where(and(
        eq(schema.threadScores.projectId, project.id),
        eq(schema.threadScores.status, 'new'),
        gte(schema.threadScores.intent, Math.max(project.intentThreshold, HOT_MIN_INTENT)),
        eq(schema.threads.state, 'open'),
        isNull(schema.threadScores.replyDraft),
      ))
      .orderBy(desc(schema.threadScores.intent))
      .limit(AUTO_REPLY_SCAN)
    const hot = rows.filter(r => assessLead({ ...r.thread, intent: r.intent }, project.competitors, now).hot)
    return { project, threadIds: hot.map(r => r.thread.id) }
  }))

  let drafted = 0
  let closed = 0
  // Round-robin: one draft per project per pass.
  for (let round = 0; drafted < AUTO_REPLY_PER_RUN && queues.some(q => q.threadIds.length > round); round++) {
    for (const { project, threadIds } of queues) {
      const threadId = threadIds[round]
      if (!threadId || drafted >= AUTO_REPLY_PER_RUN) continue
      try {
        await draftReplyForThread(ctx.db, ctx.llm, project, threadId, { tier: 'balanced', http: ctx.http, now })
        drafted++
      }
      catch (error) {
        if (error instanceof ThreadClosedError) closed++
        else ctx.log('auto-reply failed', { project: project.id, thread: threadId, error: String(error) })
      }
    }
  }
  ctx.log('auto-replies', { projects: projects.length, drafted, closed })
  return { projects: projects.length, drafted, closed }
}
