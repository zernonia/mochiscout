import type { AutoRules, Db } from '@mochiscout/db'
import type { Llm } from '@mochiscout/llm'
import type { Http } from '@mochiscout/sources'
import type { SubredditRules } from '@mochiscout/rules'
import { eq, inArray, schema } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { getRules } from '@mochiscout/rules'
import { hotPostsFeedUrl, normalizeSubreddit, parseFeedSubtitle, parseRedditFeed, parseRedditThread, postFeedUrl } from '@mochiscout/sources'

/**
 * Subreddit rules from two sources: curated files in packages/rules (checked
 * by people, preferred), else rules the LLM read from the sub's pinned posts.
 * Reddit's rules pages need a login or JavaScript, but pinned "rules" and
 * "weekly self-promotion" posts are in the public hot feed.
 */

export type RulesSource = 'curated' | 'auto'

/** Pinned-post titles that usually carry rules or the promo policy. */
const RULES_TITLE = /rule|promot|self.?promo|read (this|before|first)|guideline|weekly|megathread|faq|welcome|announcement|show ?off|share your/i
const BODY_POSTS = 2

export const AutoRulesSchema = z.object({
  promo_policy: z.enum(['none', 'weekly_thread_only', 'flair_only', 'allowed_with_value', 'allowed', 'unknown'])
    .describe('Self-promotion policy stated in the posts. "unknown" if the posts do not say.'),
  self_promo_thread: z.string().nullable().describe('Name of the recurring thread where promotion is allowed, if any'),
  links_allowed: z.enum(['none', 'in_comments_only', 'yes']).nullable().describe('Whether links to your own site are allowed, if stated'),
  min_karma: z.number().int().nullable().describe('Minimum karma to post, only if stated'),
  min_account_age_days: z.number().int().nullable().describe('Minimum account age in days, only if stated'),
  notes: z.string().describe('Up to two sentences on anything else a founder must know before mentioning their product. Empty if nothing.'),
})

/** As a SubredditRules record, so drafts, checks and the map treat both sources alike. */
export function autoToRules(name: string, auto: AutoRules | null | undefined, at: Date | null | undefined): SubredditRules | null {
  if (!auto || auto.promo_policy === 'unknown') return null
  return {
    name,
    promo_policy: auto.promo_policy,
    self_promo_thread: auto.self_promo_thread,
    min_karma: auto.min_karma,
    min_account_age_days: auto.min_account_age_days,
    links_allowed: auto.links_allowed,
    post_formats: [],
    cooldown_days: null,
    tags: ['auto'],
    notes: auto.notes,
    last_verified: (at ?? new Date()).toISOString().slice(0, 10),
    source: `https://www.reddit.com/r/${name}/about/rules`,
  }
}

export interface ResolvedRules {
  rules: SubredditRules | null
  source: RulesSource | null
}

/** Rules for many subs at once (curated first, then auto). Keys are lowercase names. */
export async function resolveRulesMany(db: Db, names: string[]): Promise<Map<string, ResolvedRules>> {
  const out = new Map<string, ResolvedRules>()
  const missing: string[] = []
  for (const raw of names) {
    const name = normalizeSubreddit(raw)
    const curated = getRules(name)
    if (curated) out.set(name, { rules: curated, source: 'curated' })
    else missing.push(name)
  }
  for (let i = 0; i < missing.length; i += 90) {
    const rows = await db.select({ name: schema.subreddits.name, autoRules: schema.subreddits.autoRules, at: schema.subreddits.autoRulesAt })
      .from(schema.subreddits).where(inArray(schema.subreddits.name, missing.slice(i, i + 90)))
    for (const r of rows) {
      const rules = autoToRules(r.name, r.autoRules, r.at)
      if (rules) out.set(r.name, { rules, source: 'auto' })
    }
  }
  for (const name of missing) if (!out.has(name)) out.set(name, { rules: null, source: null })
  return out
}

export async function resolveRules(db: Db, name: string): Promise<ResolvedRules> {
  return (await resolveRulesMany(db, [name])).get(normalizeSubreddit(name))!
}

/**
 * Read a sub's pinned posts and extract its promotion rules. Costs up to
 * three Reddit feed requests and one small LLM call; store the result even
 * when nothing is found so the sub isn't re-read for a month.
 */
export async function extractAutoRules(http: Http, llm: Llm, subreddit: string): Promise<{ rules: AutoRules, description: string | null, usage: { inputTokens: number, outputTokens: number } }> {
  const name = normalizeSubreddit(subreddit)
  const res = await http.getText(hotPostsFeedUrl(name))
  const xml = res.status === 'ok' ? res.body : ''
  const description = xml ? parseFeedSubtitle(xml) : null
  const candidates = (xml ? parseRedditFeed(xml) : []).filter(p => RULES_TITLE.test(p.title)).slice(0, 4)
  const empty: AutoRules = { promo_policy: 'unknown', self_promo_thread: null, links_allowed: null, min_karma: null, min_account_age_days: null, notes: '', evidence: [] }
  if (!candidates.length) return { rules: empty, description, usage: { inputTokens: 0, outputTokens: 0 } }

  // Full text of the most likely rules posts; the rest by title and snippet.
  const posts: { title: string, text: string }[] = []
  for (const [i, p] of candidates.entries()) {
    let text = p.snippet ?? ''
    if (i < BODY_POSTS) {
      const id = p.id.replace(/^reddit:t3_/, '')
      try {
        const page = await http.getText(postFeedUrl(name, id))
        if (page.status === 'ok') text = parseRedditThread(page.body, id)?.body ?? text
      }
      catch { /* keep the snippet */ }
    }
    posts.push({ title: p.title, text })
  }

  const { data, usage } = await llm.generate({
    tier: 'fast',
    system: 'You read pinned posts from a subreddit and extract its rules about self-promotion. Only report what the posts actually say; use null or "unknown" for anything not stated. Never guess from the subreddit topic.',
    prompt: `Subreddit: r/${name}${description ? `\nDescription: ${description}` : ''}\n\n${posts.map(p => `<post title="${p.title.replace(/"/g, '\'')}">\n${p.text.slice(0, 3000)}\n</post>`).join('\n\n')}`,
    schema: AutoRulesSchema,
    maxTokens: 1500,
  })
  return { rules: { ...data, evidence: posts.map(p => p.title) }, description, usage }
}

export async function saveAutoRules(db: Db, name: string, found: { rules: AutoRules, description: string | null }, now: Date) {
  await db.insert(schema.subreddits).values({ name, autoRules: found.rules, autoRulesAt: now, description: found.description })
    .onConflictDoUpdate({ target: schema.subreddits.name, set: { autoRules: found.rules, autoRulesAt: now, ...(found.description ? { description: found.description } : {}) } })
}

export async function subredditRow(db: Db, name: string) {
  return db.select().from(schema.subreddits).where(eq(schema.subreddits.name, normalizeSubreddit(name))).get()
}
