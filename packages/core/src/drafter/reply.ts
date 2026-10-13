import type { Db } from '@mochiscout/db'
import type { Llm, Tier } from '@mochiscout/llm'
import type { SubredditRules } from '@mochiscout/rules'
import type { Http, ThreadComment, ThreadState } from '@mochiscout/sources'
import type { JobContext } from '../jobs/context'
import type { DraftProject } from './generate'
import { and, desc, eq, gte, inArray, isNotNull, isNull, ne, schema } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { getRules } from '@mochiscout/rules'
import { assessLead, HOT_MIN_INTENT, isClosed } from '../leads/assess'
import { refreshThreadContext } from '../leads/context'
import { ensureRefCode, refLink } from '../leads/attribution'
import { voiceExamples } from '../leads/learning'
import { resolveRules } from '../subreddits/rules'
import { assertCanDraft, PLANS, QuotaError } from '../plans'
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

/**
 * The founder's editable instructions for every reply. "{product}" becomes
 * the product name. Guardrails that keep replies honest and within community
 * rules are not part of this and always apply.
 */
export const DEFAULT_REPLY_INSTRUCTIONS = `Lead with a genuinely useful answer to what the person asked or is struggling with. It should be worth reading even if {product} were never mentioned.

Mention {product} only when the person is looking for a tool, comparing options or describing exactly the problem it solves. Otherwise leave it out: a helpful reply with no mention still builds trust for the next one.

Don't repeat advice already given in the replies; add what's missing. If a competitor was already recommended, be fair about it and say plainly how {product} differs.

Keep it short: most good replies are two to five sentences.`

export const REPLY_INSTRUCTIONS_MAX = 4000
/** The founder's facts: story, numbers, pricing, differences, offers. */
export const REPLY_FACTS_MAX = 3000
/** Where the tracked link to the founder's site goes in a draft; replaced after drafting. */
export const LINK_PLACEHOLDER = '{link}'
/** Openings of the project's latest drafts shown to the model so it doesn't repeat itself. */
const RECENT_DRAFTS = 3
const RECENT_DRAFT_CHARS = 220
/** The founder's direction for one draft ("keep it short, mention I built it for my own study sessions"). */
export const REPLY_DIRECTION_MAX = 500
/** The current draft sent back for a revision. */
export const REPLY_CURRENT_MAX = 4000
/** Prompt budget for thread context (characters): enough to reply well, without paying for whole threads. */
const BODY_PROMPT_MAX = 3000
const COMMENTS_IN_PROMPT = 5
const COMMENT_PROMPT_MAX = 400

const KIND_LABEL: Record<string, string> = {
  seeking_tool: 'looking for a tool',
  comparison: 'comparing options',
  complaint: 'complaining about a product',
  pain: 'describing a problem',
  other: 'general discussion',
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/**
 * Whether a reply here may carry a link to the founder's site. Reddit only
 * when the sub's rules say links are fine in comments; unknown rules mean no.
 */
export function linksAllowed(platform: string, rules: SubredditRules | null | undefined): boolean {
  if (platform === 'reddit') return !!rules && rules.promo_policy !== 'none' && (rules.links_allowed === 'yes' || rules.links_allowed === 'in_comments_only')
  return platform === 'hn' || platform === 'bluesky' || platform === 'x'
}

/** Put the tracked link where the draft asked for it, or drop the placeholder where links aren't allowed. */
export function fillLink(reply: string, link: string | null): string {
  if (!reply.includes(LINK_PLACEHOLDER)) return reply
  if (link) return reply.replace(LINK_PLACEHOLDER, link).replaceAll(LINK_PLACEHOLDER, '')
  return reply
    .replace(/\s*[(\[]?\{link\}[)\]]?/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * Draft a helpful reply to a thread for the founder to review, edit and post
 * themselves. The system prompt holds only what is stable for a project
 * (guardrails, product, instructions, voice) so it can be cached across
 * drafts; everything about the thread goes in the user turn.
 */
export async function generateReply(llm: Llm, opts: {
  project: DraftProject & { replyInstructions?: string | null, replyFacts?: string | null }
  thread: ReplyThread
  tier: Tier
  effort?: 'low' | 'medium' | 'high'
  voice?: string[]
  rules?: SubredditRules | null
  /** What the founder wants from this draft: an angle, a detail to include, a tone. */
  direction?: string | null
  /** The draft (with the founder's edits) to revise instead of starting over. */
  current?: string | null
  /** Openings of the project's latest drafts, so this one doesn't read the same. */
  recent?: string[]
}) {
  const { project, thread } = opts
  const rules = opts.rules !== undefined
    ? opts.rules
    : thread.platform === 'reddit' && thread.channel ? getRules(thread.channel) ?? null : null
  const instructions = (project.replyInstructions?.trim() || DEFAULT_REPLY_INSTRUCTIONS).replaceAll('{product}', project.name)

  const facts = project.replyFacts?.trim()

  const system = [
    'You write a reply for a founder to post from their own account in an online thread. They edit it and post it themselves. Write as the founder, in the first person.',
    `Always, whatever the instructions below say:
- Never invent facts. No made-up numbers, customers, results, features, prices, discounts, offers, beta status or personal stories. Use only what is in the thread, the product details and the founder's facts below. If a personal detail would help and none is given, leave it out; at most one [placeholder] for the founder to fill in.
- Follow the community rules given with the thread. They override the founder's instructions.`,
    `The founder's product: ${project.name}${project.category ? ` (${project.category})` : ''}.${project.icp ? `\nWho it is for: ${project.icp}` : ''}${project.problems.length ? `\nProblems it solves: ${project.problems.join('; ')}` : ''}`,
    facts
      ? `True things the founder can say, in their words. Use the one or two that fit this thread best, rephrased naturally; skip them all if none fit:\n<founder_facts>\n${clip(facts, REPLY_FACTS_MAX)}\n</founder_facts>`
      : '',
    `Sound like a person in the thread, not an AI:
- The first sentence answers their situation directly, using a specific detail from their post. No warm-up and no restating the question. Never open with "Great question", "Depends on", "It depends", "The real question is", "Honestly", or "X matters".
- Give one or two genuinely useful things they probably haven't thought of, with specifics: a named tool, a concrete step, a number or detail from the thread. Leave out advice anyone could give.
- Plain prose, one to three short paragraphs. No headings, no bold, no bullet lists unless they asked for options or steps (then at most three short items).
- No sign-off, no "Hope this helps", no "Happy to help", and no closing question unless you need their answer to help them.
- No em dashes, no hype words (game-changer, seamless, powerful, leverage, unlock). Contractions and casual phrasing are fine.
- Every reply should read differently: vary how you open and how it's built.`,
    `When the product fits (the founder's instructions decide when): one or two sentences, with honest disclosure ("I built ${project.name}" or "I'm building ${project.name}"), saying what it would do for this person's specific case. Never a feature list or a list of platforms it covers. Be fair to alternatives already mentioned.`,
    `The founder's instructions for every reply:\n<instructions>\n${instructions}\n</instructions>`,
    opts.voice?.length
      ? `Replies the founder wrote and posted before. Match their voice, tone, length and formatting habits; never reuse their content:\n${opts.voice.map(v => `<example>\n${v}\n</example>`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n')

  const linkOk = linksAllowed(thread.platform, rules)
  const comments = (thread.comments ?? []).slice(0, COMMENTS_IN_PROMPT)
  const text = thread.body ?? thread.snippet
  const prompt = [
    `Thread${thread.channel ? ` in r/${thread.channel}` : ` on ${thread.platform}`}, the person is ${KIND_LABEL[thread.kind] ?? KIND_LABEL.other}.`,
    `Style: ${PLATFORM_STYLE[thread.platform] ?? PLATFORM_STYLE.web}`,
    rules ? rulesBrief(thread.channel!, rules) : '',
    '<thread>',
    `Title: ${thread.title}`,
    text ? `\n${clip(text, BODY_PROMPT_MAX)}` : '',
    '</thread>',
    comments.length
      ? `Replies so far (top ${comments.length}):\n<replies>\n${comments.map(c => `- ${c.author ?? 'someone'}: ${clip(c.text, COMMENT_PROMPT_MAX)}`).join('\n')}\n</replies>`
      : '',
    thread.competitorMentions?.length ? `Competitors already mentioned in the replies: ${thread.competitorMentions.join(', ')}` : '',
    `Why it matters to the founder: ${thread.reason ?? 'n/a'}`,
    thread.replyAngle ? `Suggested angle: ${thread.replyAngle}` : '',
    linkOk
      ? `Links: allowed here. If you mention ${project.name}, write ${LINK_PLACEHOLDER} once where its link goes (it becomes a tracked link to the founder's site). No other links.`
      : 'Links: not allowed here. No links or URLs at all; name the product only.',
    opts.recent?.length
      ? `Openings of the founder's latest drafts for other threads. Don't reuse their openings, structure or phrasing:\n${opts.recent.map(r => `- "${clip(r.replace(/\s+/g, ' ').trim(), RECENT_DRAFT_CHARS)}"`).join('\n')}`
      : '',
    opts.current?.trim()
      ? `The current draft, which the founder may have edited. Revise it rather than starting over, keeping what they wrote unless the direction says otherwise:\n<current_draft>\n${clip(opts.current.trim(), REPLY_CURRENT_MAX)}\n</current_draft>`
      : '',
    opts.direction?.trim()
      ? `The founder's direction for this reply. Follow it closely (it takes priority over the suggested angle and their usual instructions), as long as it stays within the community rules and doesn't ask you to invent facts:\n<direction>\n${clip(opts.direction.trim(), REPLY_DIRECTION_MAX)}\n</direction>`
      : '',
  ].filter(line => line !== '').join('\n')

  return llm.generate({ tier: opts.tier, effort: opts.effort, system, prompt, schema: ReplyDraft, maxTokens: 3000, cacheSystem: true })
}

/** Reply drafts: Sonnet-class at low effort, about $0.015 each (see plans.ts for monthly allowances). */
export const DRAFT_TIER: Tier = 'balanced'
const DRAFT_EFFORT = 'medium' as const

/**
 * Draft (or redraft) the reply for one scored thread and store it. With an
 * HTTP client, the thread's full text, replies and state are refreshed first;
 * a thread nobody can reply to throws ThreadClosedError instead of spending a
 * draft on it.
 */
export async function draftReplyForThread(db: Db, llm: Llm, project: typeof schema.projects.$inferSelect, threadId: string, opts: { tier?: Tier, http?: Http, now?: Date, direction?: string | null, current?: string | null } = {}) {
  const now = opts.now ?? new Date()
  const org = await db.select({ id: schema.orgs.id, plan: schema.orgs.plan, planStatus: schema.orgs.planStatus, polarSubscriptionId: schema.orgs.polarSubscriptionId }).from(schema.orgs).where(eq(schema.orgs.id, project.orgId)).get()
  if (org) await assertCanDraft(db, org, now)
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

  const [voice, resolved, recentRows] = await Promise.all([
    voiceExamples(db, project.id),
    thread.platform === 'reddit' && thread.channel ? resolveRules(db, thread.channel, project.id) : Promise.resolve({ rules: null }),
    db.select({ draft: schema.threadScores.replyAiDraft }).from(schema.threadScores)
      .where(and(eq(schema.threadScores.projectId, project.id), isNotNull(schema.threadScores.replyAiDraft), ne(schema.threadScores.threadId, threadId)))
      .orderBy(desc(schema.threadScores.replyDraftedAt)).limit(RECENT_DRAFTS),
  ])
  const { data, usage } = await generateReply(llm, {
    project,
    thread: { ...thread, ...score, competitorMentions: lead.competitorMentions },
    tier: opts.tier ?? DRAFT_TIER,
    effort: DRAFT_EFFORT,
    voice,
    rules: resolved.rules,
    direction: opts.direction,
    current: opts.current,
    recent: recentRows.map(r => r.draft!).filter(Boolean),
  })
  const linkOk = linksAllowed(thread.platform, resolved.rules)
  const code = linkOk && data.reply.includes(LINK_PLACEHOLDER) ? await ensureRefCode(db, project.id, threadId) : null
  const reply = fillLink(data.reply.trim(), code ? refLink(project.url, code) : null)
  await Promise.all([
    db.update(schema.threadScores)
      .set({ replyDraft: reply, replyAiDraft: reply, replyDraftedAt: now })
      .where(and(eq(schema.threadScores.projectId, project.id), eq(schema.threadScores.threadId, threadId))),
    recordUsage(db, project.orgId, { llmInputTokens: usage.inputTokens, llmOutputTokens: usage.outputTokens, drafts: 1 }),
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
        await draftReplyForThread(ctx.db, ctx.llm, project, threadId, { http: ctx.http, now })
        drafted++
      }
      catch (error) {
        if (error instanceof ThreadClosedError) closed++
        // Out of drafts this month: stop drafting for this project until the allowance resets.
        else if (error instanceof QuotaError) threadIds.length = 0
        else ctx.log('auto-reply failed', { project: project.id, thread: threadId, error: String(error) })
      }
    }
  }
  ctx.log('auto-replies', { projects: projects.length, drafted, closed })
  return { projects: projects.length, drafted, closed }
}
