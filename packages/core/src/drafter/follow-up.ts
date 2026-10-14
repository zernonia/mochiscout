import type { Db } from '@mochiscout/db'
import type { Llm, Tier } from '@mochiscout/llm'
import type { SubredditRules } from '@mochiscout/rules'
import type { DraftProject } from './generate'
import { and, eq, schema } from '@mochiscout/db'
import { ensureRefCode, refLink } from '../leads/attribution'
import { voiceExamples } from '../leads/learning'
import { assertCanDraft } from '../plans'
import { resolveRules } from '../subreddits/rules'
import { recordUsage } from '../usage'
import { rulesBrief } from './generate'
import { DRAFT_TIER, fillLink, LINK_PLACEHOLDER, linksAllowed, ReplyDraft } from './reply'

const TEXT_MAX = 1500
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/**
 * Draft the founder's answer to someone who replied to them. Same rules as a
 * first reply (no invented facts, honest disclosure, community rules), but
 * short and conversational: answer what they said or asked.
 */
export async function generateFollowUp(llm: Llm, opts: {
  project: DraftProject & { replyFacts?: string | null }
  thread: { platform: string, channel: string | null, title: string }
  /** The founder's posted reply. */
  ownReply: string
  response: { author: string | null, text: string }
  tier: Tier
  voice?: string[]
  rules?: SubredditRules | null
  direction?: string | null
}) {
  const { project, thread } = opts
  const facts = opts.project.replyFacts?.trim()
  const system = [
    'You write a short follow-up for a founder to post from their own account, answering someone who replied to the founder\'s comment in an online thread. They edit it and post it themselves. Write as the founder, in the first person.',
    `Always:
- Never invent facts. No made-up numbers, customers, features, prices, discounts or personal stories. Use only the thread, the product details and the founder's facts below. If you don't know the answer to their question, say what you'd check or ask them a clarifying question; at most one [placeholder] for the founder to fill in.
- Follow the community rules given with the thread.`,
    `The founder's product: ${project.name}${project.category ? ` (${project.category})` : ''}.${project.icp ? `\nWho it is for: ${project.icp}` : ''}${project.problems.length ? `\nProblems it solves: ${project.problems.join('; ')}` : ''}`,
    facts ? `True things the founder can say:\n<founder_facts>\n${clip(facts, 3000)}\n</founder_facts>` : '',
    `Style:
- Answer what they said or asked, directly, in the first sentence. One short paragraph; two at most if they asked several things.
- Conversational and warm, like a person continuing a chat. No sign-off, no "Great question", no "Happy to help", no em dashes, no hype words.
- Mention the product only if they asked about it or it is clearly what they want; if the founder's comment already disclosed it, don't repeat the pitch.`,
    opts.voice?.length ? `Replies the founder wrote before. Match their voice; never reuse content:\n${opts.voice.map(v => `<example>\n${v}\n</example>`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')

  const linkOk = linksAllowed(thread.platform, opts.rules)
  const prompt = [
    `Thread${thread.channel ? ` in r/${thread.channel}` : ` on ${thread.platform}`}: ${thread.title}`,
    opts.rules && thread.channel ? rulesBrief(thread.channel, opts.rules) : '',
    `The founder's comment:\n<founder_comment>\n${clip(opts.ownReply, TEXT_MAX)}\n</founder_comment>`,
    `${opts.response.author ?? 'Someone'} replied:\n<their_reply>\n${clip(opts.response.text, TEXT_MAX)}\n</their_reply>`,
    linkOk
      ? `Links: allowed, but only if they asked for one. Then write ${LINK_PLACEHOLDER} once where the link goes. No other links.`
      : 'Links: not allowed here. No links or URLs.',
    opts.direction?.trim() ? `The founder's direction for this follow-up (follow it within the rules above):\n<direction>\n${clip(opts.direction.trim(), 500)}\n</direction>` : '',
  ].filter(Boolean).join('\n')

  return llm.generate({ tier: opts.tier, effort: 'low', system, prompt, schema: ReplyDraft, maxTokens: 1500, cacheSystem: true })
}

/** Draft and store a follow-up for one response. Counts as one AI draft against the plan. */
export async function draftFollowUpForResponse(db: Db, llm: Llm, project: typeof schema.projects.$inferSelect, responseId: string, opts: { now?: Date, direction?: string | null } = {}) {
  const now = opts.now ?? new Date()
  const org = await db.select({ id: schema.orgs.id, plan: schema.orgs.plan, planStatus: schema.orgs.planStatus, polarSubscriptionId: schema.orgs.polarSubscriptionId }).from(schema.orgs).where(eq(schema.orgs.id, project.orgId)).get()
  if (org) await assertCanDraft(db, org, now)
  const rr = schema.replyResponses
  const row = await db.select({ response: rr, thread: schema.threads, ownReply: schema.threadScores.replyText, draft: schema.threadScores.replyDraft })
    .from(rr)
    .innerJoin(schema.threads, eq(schema.threads.id, rr.threadId))
    .innerJoin(schema.threadScores, and(eq(schema.threadScores.projectId, rr.projectId), eq(schema.threadScores.threadId, rr.threadId)))
    .where(and(eq(rr.projectId, project.id), eq(rr.id, responseId)))
    .get()
  if (!row) return null
  const [voice, resolved] = await Promise.all([
    voiceExamples(db, project.id),
    row.thread.platform === 'reddit' && row.thread.channel ? resolveRules(db, row.thread.channel, project.id) : Promise.resolve({ rules: null }),
  ])
  const { data, usage } = await generateFollowUp(llm, {
    project,
    thread: row.thread,
    ownReply: row.ownReply ?? row.draft ?? '',
    response: { author: row.response.author, text: row.response.body },
    tier: DRAFT_TIER,
    voice,
    rules: resolved.rules,
    direction: opts.direction,
  })
  const linkOk = linksAllowed(row.thread.platform, resolved.rules)
  const code = linkOk && data.reply.includes(LINK_PLACEHOLDER) ? await ensureRefCode(db, project.id, row.thread.id) : null
  const followUp = fillLink(data.reply.trim(), code ? refLink(project.url, code) : null)
  await Promise.all([
    db.update(rr).set({ followUp }).where(and(eq(rr.projectId, project.id), eq(rr.id, responseId))),
    recordUsage(db, project.orgId, { llmInputTokens: usage.inputTokens, llmOutputTokens: usage.outputTokens, drafts: 1 }),
  ])
  return { followUp }
}
