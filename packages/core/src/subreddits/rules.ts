import type { Db } from '@mochiscout/db'
import type { Llm } from '@mochiscout/llm'
import type { OfficialRule, SubredditRules } from '@mochiscout/rules'
import type { Http, PageFetcher } from '@mochiscout/sources'
import { and, eq, inArray, schema } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { getRules, LINKS_ALLOWED, PROMO_POLICIES } from '@mochiscout/rules'
import { HttpDeferredError, hotPostsFeedUrl, normalizeSubreddit, parseRedditFeed, parseRedditThread, postFeedUrl, readOfficialRules } from '@mochiscout/sources'

/**
 * Subreddit rules come from the rules library in the repo
 * (packages/rules/subreddits/*.yaml, refreshed from each sub's official rules
 * by `pnpm rules:sync`). A project can keep its own copy of a sub's rules
 * (`project_subreddits.rules_override_json`), which wins for that project.
 */

export type RulesSource = 'library' | 'custom'

/** The fields a founder can change in their own copy of a sub's rules. */
export const CustomRules = z.object({
  promo_policy: z.enum(PROMO_POLICIES),
  self_promo_thread: z.string().trim().max(200).nullable(),
  min_karma: z.number().int().nonnegative().max(1_000_000).nullable(),
  min_account_age_days: z.number().int().nonnegative().max(10_000).nullable(),
  links_allowed: z.enum(LINKS_ALLOWED).nullable(),
  cooldown_days: z.number().int().positive().max(365).nullable(),
  notes: z.string().trim().max(1000),
})
export type CustomRules = z.infer<typeof CustomRules>

export interface ResolvedRules {
  rules: SubredditRules | null
  source: RulesSource | null
  /** The library's version, also when the project uses its own copy. */
  library: SubredditRules | null
}

/** A project's own copy, on top of the library file (official rules and tags stay the library's). */
export function applyCustomRules(name: string, library: SubredditRules | null, custom: CustomRules, at: Date): SubredditRules {
  return {
    name: library?.name ?? name,
    post_formats: library?.post_formats ?? [],
    tags: library?.tags ?? ['custom'],
    official: library?.official ?? [],
    keep: [],
    source: library?.source ?? `https://www.reddit.com/r/${name}/about/rules`,
    ...custom,
    self_promo_thread: custom.self_promo_thread || null,
    last_verified: at.toISOString().slice(0, 10),
  }
}

/** Rules for many subs at once: the project's own copy, else the library. Keys are lowercase names. */
export async function resolveRulesMany(db: Db, names: string[], projectId?: string): Promise<Map<string, ResolvedRules>> {
  const all = [...new Set(names.map(normalizeSubreddit))]
  const custom = new Map<string, { rules: CustomRules, at: Date }>()
  if (projectId) {
    const ps = schema.projectSubreddits
    for (let i = 0; i < all.length; i += 90) {
      const rows = await db.select({ name: ps.subreddit, rules: ps.rulesOverride, at: ps.rulesOverrideAt }).from(ps)
        .where(and(eq(ps.projectId, projectId), inArray(ps.subreddit, all.slice(i, i + 90))))
      for (const r of rows) {
        const parsed = r.rules ? CustomRules.safeParse(r.rules) : null
        if (parsed?.success) custom.set(r.name, { rules: parsed.data, at: r.at ?? new Date() })
      }
    }
  }
  const out = new Map<string, ResolvedRules>()
  for (const name of all) {
    const library = getRules(name) ?? null
    const own = custom.get(name)
    if (own) out.set(name, { rules: applyCustomRules(name, library, own.rules, own.at), source: 'custom', library })
    else out.set(name, { rules: library, source: library ? 'library' : null, library })
  }
  return out
}

export async function resolveRules(db: Db, name: string, projectId?: string): Promise<ResolvedRules> {
  return (await resolveRulesMany(db, [name], projectId)).get(normalizeSubreddit(name))!
}

/** Pinned-post titles that usually carry rules or the promo policy. */
const RULES_TITLE = /rule|promot|self.?promo|read (this|before|first)|guideline|weekly|megathread|faq|welcome|announcement|show ?off|share your/i
const BODY_POSTS = 2
const OFFICIAL_PROMPT_MAX = 12_000

export const ExtractedRulesSchema = z.object({
  promo_policy: z.enum(['none', 'weekly_thread_only', 'flair_only', 'allowed_with_value', 'allowed', 'unknown'])
    .describe('Self-promotion policy stated in the text. "unknown" if it does not say.'),
  self_promo_thread: z.string().nullable().describe('Name of the recurring thread where promotion is allowed, if any'),
  links_allowed: z.enum(['none', 'in_comments_only', 'yes']).nullable().describe('Whether links to your own site are allowed, if stated'),
  min_karma: z.number().int().nullable().describe('Minimum karma to post, only if stated'),
  min_account_age_days: z.number().int().nullable().describe('Minimum account age in days, only if stated'),
  cooldown_days: z.number().int().nullable().describe('Minimum days between promotional mentions or posts, only if stated (e.g. "1 mention every 60 days" is 60)'),
  post_formats: z.array(z.enum(['text', 'link', 'image', 'video'])).describe('Post formats the rules require or allow, only if stated; empty if not'),
  tags: z.array(z.string()).describe('2 to 5 lowercase topic tags for the community (e.g. saas, startups, marketing), a-z, 0-9 and hyphens'),
  notes: z.string().describe('Up to two sentences on anything else a founder must know before mentioning their product, such as required disclosure or kinds of products that are banned. Empty if nothing.'),
})

export type ReadRulesResult =
  | { status: 'ok', rules: SubredditRules, usage: { inputTokens: number, outputTokens: number } }
  /** Banned, private or doesn't exist. */
  | { status: 'missing' }

/**
 * Read a sub's official rules (page fetch service) and pinned posts (Reddit
 * RSS, best effort), and turn them into a rules-library record with one
 * small LLM call. Used by `pnpm rules:sync`, never at request time.
 */
export async function readSubredditRules(http: Http, llm: Llm, pages: PageFetcher, subreddit: string, today: string): Promise<ReadRulesResult> {
  const name = normalizeSubreddit(subreddit)
  const res = await readOfficialRules(pages, name)
  if (res.status === 'missing') return { status: 'missing' }
  if (res.status === 'failed') throw new Error(`official rules unavailable (${res.error})`)
  const official = res.rules
  const description = res.about?.description ?? null

  // Pinned posts often name the weekly promo thread, which official rules rarely do.
  const posts: { title: string, text: string }[] = []
  try {
    const feed = await http.getText(hotPostsFeedUrl(name))
    const candidates = (feed.status === 'ok' ? parseRedditFeed(feed.body) : []).filter(p => RULES_TITLE.test(p.title)).slice(0, 4)
    for (const [i, p] of candidates.entries()) {
      let text = p.snippet ?? ''
      if (i < BODY_POSTS) {
        const id = p.id.replace(/^reddit:t3_/, '')
        const page = await http.getText(postFeedUrl(name, id)).catch(() => null)
        if (page?.status === 'ok') text = parseRedditThread(page.body, id)?.body ?? text
      }
      posts.push({ title: p.title, text })
    }
  }
  catch (error) {
    if (error instanceof HttpDeferredError) throw error
    // Reddit refused the feed: the official rules are enough.
  }

  const { data, usage } = await llm.generate({
    tier: 'fast',
    system: 'You read a subreddit\'s official rules and pinned posts and extract its rules about self-promotion: mentioning or linking your own product in posts and comments. The official rules are authoritative; pinned posts can add details such as the name of the promo thread. If they conflict, the official rules win. Only report what the text actually says; use null, [] or "unknown" for anything not stated. Never guess from the subreddit topic.',
    prompt: [
      `Subreddit: r/${name}${description ? `\nDescription: ${description}` : ''}`,
      official.length
        ? `<official_rules>\n${officialRulesText(official).slice(0, OFFICIAL_PROMPT_MAX)}\n</official_rules>`
        : 'The subreddit has no official rules listed.',
      ...posts.map(p => `<pinned_post title="${p.title.replace(/"/g, '\'')}">\n${p.text.slice(0, 3000)}\n</pinned_post>`),
    ].join('\n\n'),
    schema: ExtractedRulesSchema,
    maxTokens: 1500,
  })
  // Rules that never mention promotion don't forbid it.
  const silent = data.promo_policy === 'unknown'
  const tags = [...new Set(data.tags.map(t => t.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')).filter(Boolean))].slice(0, 5)
  return {
    status: 'ok',
    usage,
    rules: {
      name: res.about?.name && res.about.name.toLowerCase() === name ? res.about.name : name,
      promo_policy: silent ? 'allowed_with_value' : data.promo_policy as SubredditRules['promo_policy'],
      self_promo_thread: data.self_promo_thread || null,
      min_karma: data.min_karma != null && data.min_karma >= 0 ? data.min_karma : null,
      min_account_age_days: data.min_account_age_days != null && data.min_account_age_days >= 0 ? data.min_account_age_days : null,
      links_allowed: data.links_allowed,
      post_formats: data.post_formats,
      cooldown_days: data.cooldown_days && data.cooldown_days > 0 ? data.cooldown_days : null,
      tags: tags.length ? tags : [name.toLowerCase().replace(/_/g, '-')],
      notes: silent ? [data.notes, 'The rules don\'t mention self-promotion.'].filter(Boolean).join(' ') : data.notes,
      last_verified: today,
      official,
      keep: [],
      source: `https://www.reddit.com/r/${name}/about/rules`,
    },
  }
}

function officialRulesText(official: OfficialRule[]) {
  return official.map((r, i) => `${i + 1}. ${r.title}${r.kind !== 'all' ? ` (${r.kind === 'link' ? 'posts only' : 'comments only'})` : ''}\n${r.text}`).join('\n\n')
}
