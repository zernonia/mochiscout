import type { Db } from '@mochiscout/db'
import type { Llm, Tier } from '@mochiscout/llm'
import type { JobContext } from '../jobs/context'
import type { DraftProject } from './generate'
import { and, eq, gte, inArray, isNull, schema } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { getRules } from '@mochiscout/rules'
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
}

const PLATFORM_STYLE: Record<string, string> = {
  reddit: 'Reddit comment: conversational, 40-150 words, short paragraphs. Markdown is fine.',
  hn: 'Hacker News comment: plain, technical and understated, 40-150 words. No marketing language at all; HN readers punish it.',
  bluesky: 'Bluesky reply: under 300 characters, friendly and direct.',
  x: 'X reply: under 280 characters, direct, no hashtags.',
  web: 'Forum or blog comment: conversational, 40-150 words.',
}

/** Draft a helpful reply to a thread for the founder to review, edit and post themselves. */
export async function generateReply(llm: Llm, opts: { project: DraftProject, thread: ReplyThread, tier: Tier }) {
  const { project, thread } = opts
  const rules = thread.platform === 'reddit' && thread.channel ? getRules(thread.channel) ?? null : null
  const asksForTool = thread.kind === 'seeking_tool' || thread.kind === 'comparison'
  const system = `You help a founder reply to an online thread. They will review, edit and post the reply themselves from their own account.

Write as the founder, in the first person. Lead with a genuinely useful answer to what the person asked or is struggling with: specific advice, trade-offs, what worked for others. It must be worth reading even if the product were never mentioned.

${asksForTool
    ? `The person is looking for a tool, so mentioning ${project.name} is welcome if it truly fits: at most once, with honest disclosure ("I built ${project.name}" or "I'm working on ${project.name}"), alongside fair mention of other options where relevant.`
    : `The person is not asking for a tool. Do not mention ${project.name} unless it is directly and obviously useful; when in doubt, leave it out and just help.`}

Never invent facts, numbers, features or customer stories. Where a specific detail is needed and unknown, write a placeholder like [your experience here]. No links. No emoji, hashtags, hype or sign-offs.

Style: ${PLATFORM_STYLE[thread.platform] ?? PLATFORM_STYLE.web}${rules ? `\n\n${rulesBrief(thread.channel!, rules)}` : ''}`

  const prompt = [
    `Thread${thread.channel ? ` in r/${thread.channel}` : ` on ${thread.platform}`}:`,
    `<thread>`,
    `Title: ${thread.title}`,
    thread.snippet ? `\n${thread.snippet}` : '',
    `</thread>`,
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

/** Draft (or redraft) the reply for one scored thread and store it. Returns the stored draft. */
export async function draftReplyForThread(db: Db, llm: Llm, project: typeof schema.projects.$inferSelect, threadId: string, tier: Tier = 'quality') {
  const row = await db
    .select({
      platform: schema.threads.platform,
      channel: schema.threads.channel,
      title: schema.threads.title,
      snippet: schema.threads.snippet,
      kind: schema.threadScores.kind,
      reason: schema.threadScores.reason,
      replyAngle: schema.threadScores.replyAngle,
    })
    .from(schema.threadScores)
    .innerJoin(schema.threads, eq(schema.threads.id, schema.threadScores.threadId))
    .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId)))
    .get()
  if (!row) return null

  const { data, usage } = await generateReply(llm, { project, thread: row, tier })
  const draftedAt = new Date()
  await Promise.all([
    db.update(schema.threadScores)
      .set({ replyDraft: data.reply.trim(), replyDraftedAt: draftedAt })
      .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId))),
    recordUsage(db, project.orgId, { llmInputTokens: usage.inputTokens, llmOutputTokens: usage.outputTokens }),
  ])
  return { replyDraft: data.reply.trim(), replyDraftedAt: draftedAt }
}

/** Replies drafted per cron tick across all projects (bounded LLM spend and Worker time). */
const AUTO_REPLY_PER_RUN = 10
/** Only draft for threads scored recently; older ones are likely stale. */
const AUTO_REPLY_MAX_AGE_MS = 3 * 86_400_000

/** Cron: draft replies for new inbox threads in projects that turned on auto-replies. */
export async function runAutoReplies(ctx: JobContext) {
  if (!ctx.llm) return { skipped: 'no LLM configured' }
  const plans = Object.entries(PLANS).filter(([, l]) => l.autoReplies).map(([p]) => p as keyof typeof PLANS)
  const projects = await ctx.db
    .select({ project: schema.projects })
    .from(schema.projects)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.projects.orgId))
    .where(and(eq(schema.projects.autoReply, true), inArray(schema.orgs.plan, plans)))
  let drafted = 0
  const since = new Date(ctx.now().getTime() - AUTO_REPLY_MAX_AGE_MS)
  for (const { project } of projects) {
    if (drafted >= AUTO_REPLY_PER_RUN) break
    const pending = await ctx.db
      .select({ threadId: schema.threadScores.threadId })
      .from(schema.threadScores)
      .where(and(
        eq(schema.threadScores.projectId, project.id),
        eq(schema.threadScores.status, 'new'),
        gte(schema.threadScores.intent, project.intentThreshold),
        gte(schema.threadScores.scoredAt, since),
        isNull(schema.threadScores.replyDraft),
      ))
      .limit(AUTO_REPLY_PER_RUN - drafted)
    for (const { threadId } of pending) {
      try {
        await draftReplyForThread(ctx.db, ctx.llm, project, threadId, 'fast')
        drafted++
      }
      catch (error) {
        ctx.log('auto-reply failed', { project: project.id, thread: threadId, error: String(error) })
      }
    }
  }
  return { projects: projects.length, drafted }
}
