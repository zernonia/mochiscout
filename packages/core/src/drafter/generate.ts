import type { Llm } from '@mochiscout/llm'
import type { SubredditRules } from '@mochiscout/rules'
import type { CheckLevel } from './checks'
import { z } from '@mochiscout/llm'

export const ANGLES = ['story', 'lesson', 'question', 'showcase'] as const
export type Angle = typeof ANGLES[number]

const ANGLE_BRIEF: Record<Angle, string> = {
  story: 'A first-person story about something that happened while building or using this kind of product: specific, honest, with numbers where possible.',
  lesson: 'A practical lesson or how-to that is useful even to readers who never try the product.',
  question: 'A genuine question to the community about a problem the founder is working through, giving enough context that people can answer well.',
  showcase: 'An honest "I built this" post: the problem, what was built, what is still rough, and a request for feedback.',
}

export const Draft = z.object({
  title: z.string().describe('Post title, under 300 characters, in the subreddit\'s usual style'),
  body: z.string().describe('Post body in Reddit markdown'),
})

export const ToneCheck = z.object({
  level: z.enum(['pass', 'warn', 'fail']).describe('fail: reads as an ad or breaks the sub\'s notes; warn: some fixes needed; pass: reads like a genuine community post'),
  issues: z.array(z.string()).describe('Specific problems, one sentence each; empty when passing'),
})

export interface DraftProject {
  name: string
  url: string
  category: string | null
  icp: string | null
  problems: string[]
}

/** Per-rule and total budget for the official rules in a prompt (they repeat on every draft). */
const OFFICIAL_RULE_CHARS = 280
const OFFICIAL_BRIEF_MAX = 2800

export function rulesBrief(subreddit: string, rules: SubredditRules | null) {
  if (!rules) return `r/${subreddit}: rules unknown. Assume promotion is frowned upon and links in the body are risky.`
  const official = rules.official?.length
    ? `r/${subreddit}'s own rules (abridged; these win over everything above):\n${rules.official.map((r, i) => {
        const text = r.text.replace(/\s+/g, ' ').trim()
        return `${i + 1}. ${r.title}${r.kind !== 'all' ? ` [${r.kind === 'link' ? 'posts' : 'comments'}]` : ''}${text ? `: ${text.length > OFFICIAL_RULE_CHARS ? `${text.slice(0, OFFICIAL_RULE_CHARS)}…` : text}` : ''}`
      }).join('\n').slice(0, OFFICIAL_BRIEF_MAX)}`
    : ''
  return [
    `r/${subreddit} rules:`,
    `- promotion: ${rules.promo_policy.replaceAll('_', ' ')}`,
    `- links: ${rules.links_allowed?.replaceAll('_', ' ') ?? 'unknown'}`,
    rules.cooldown_days ? `- at most one promotional mention every ${rules.cooldown_days} days` : '',
    rules.post_formats.length ? `- formats: ${rules.post_formats.join(', ')}` : '',
    rules.notes ? `- mods' notes: ${rules.notes}` : '',
    official,
  ].filter(Boolean).join('\n')
}

export async function generateDraft(llm: Llm, opts: {
  project: DraftProject
  subreddit: string
  rules: SubredditRules | null
  angle: Angle
  promo: boolean
  topic?: string | null
}) {
  const { project, subreddit, rules, angle, promo, topic } = opts
  const linksInBody = rules?.links_allowed === 'yes'
  const system = `You help a founder write a Reddit post they will review, edit and post themselves. Write like a real member of r/${subreddit}: plain, specific, no hype, no emoji, no marketing phrases, no hashtags. Never invent facts, numbers or customer stories about the product; where a specific detail is needed and unknown, write a clearly marked placeholder like [your number here].

${rulesBrief(subreddit, rules)}`
  const prompt = [
    `Angle: ${angle}. ${ANGLE_BRIEF[angle]}`,
    topic ? `Topic: ${topic}` : '',
    '',
    `The founder's product: ${project.name}${project.category ? ` (${project.category})` : ''}.`,
    project.icp ? `Who it is for: ${project.icp}` : '',
    project.problems.length ? `Problems it solves: ${project.problems.join('; ')}` : '',
    '',
    promo
      ? `Mention the product at most once, near the end, with honest disclosure ("I'm building ${project.name}"). ${linksInBody ? `A link (${project.url}) is allowed.` : 'Do not include any link.'} The post must be worth reading without the mention.`
      : 'Do not mention the product or any link. This post builds trust in the community.',
  ].filter(line => line !== null).join('\n')

  // Same cost profile as reply drafts (Sonnet-class, low effort): posts count toward the draft allowance.
  return llm.generate({ tier: 'balanced', effort: 'low', system, prompt, schema: Draft, maxTokens: 6000 })
}

/** LLM check: tone (too promotional?) and fit with the subreddit's notes. */
export async function checkTone(llm: Llm, opts: {
  subreddit: string
  rules: SubredditRules | null
  title: string
  body: string
  promo: boolean
}): Promise<{ level: CheckLevel, issues: string[], usage: { inputTokens: number, outputTokens: number } }> {
  const res = await llm.generate({
    tier: 'balanced',
    effort: 'low',
    system: `You are a strict but fair moderator of r/${opts.subreddit}. Judge whether this post would be welcome or removed as self-promotion or low effort.\n\n${rulesBrief(opts.subreddit, opts.rules)}`,
    prompt: `${opts.promo ? 'The author mentions their own product.' : 'The author says the post does not promote anything.'}\n\nTitle: ${opts.title}\n\n${opts.body}`,
    schema: ToneCheck,
    maxTokens: 3000,
  })
  return { ...res.data, usage: res.usage }
}
