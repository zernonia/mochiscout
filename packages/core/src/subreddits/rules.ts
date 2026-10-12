import type { AutoRules, Db } from '@mochiscout/db'
import type { Llm } from '@mochiscout/llm'
import type { Http, OfficialRule, PageFetcher } from '@mochiscout/sources'
import type { SubredditRules } from '@mochiscout/rules'
import { eq, inArray, schema } from '@mochiscout/db'
import { z } from '@mochiscout/llm'
import { getRules } from '@mochiscout/rules'
import { HttpDeferredError, hotPostsFeedUrl, normalizeSubreddit, parseFeedSubtitle, parseRedditFeed, parseRedditThread, postFeedUrl, readOfficialRules } from '@mochiscout/sources'

/**
 * Subreddit rules, best source first:
 * 1. official: the sub's own rules (about/rules.json, read through the page
 *    fetch service), summarised by the LLM and kept verbatim alongside;
 * 2. curated: files in packages/rules, for subs whose official rules can't be read;
 * 3. auto: what the LLM read from the sub's pinned posts.
 * Nobody types rules in by hand, so they can't drift from what the mods wrote.
 */

export type RulesSource = 'official' | 'curated' | 'auto'

/** Rules plus the sub's official rule list, when known (for drafts and the UI). */
export type ResolvedSubredditRules = SubredditRules & { official?: OfficialRule[] }

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
  cooldown_days: z.number().int().nullable().describe('Minimum days between promotional mentions or posts, only if stated (e.g. "1 mention every 60 days" is 60)'),
  notes: z.string().describe('Up to two sentences on anything else a founder must know before mentioning their product. Empty if nothing.'),
})

const hasOfficial = (auto: AutoRules | null | undefined): auto is AutoRules & { official: OfficialRule[] } => !!auto?.official?.length

/** As a SubredditRules record, so drafts, checks and the map treat every source alike. */
export function autoToRules(name: string, auto: AutoRules | null | undefined, at: Date | null | undefined): ResolvedSubredditRules | null {
  if (!auto) return null
  const official = hasOfficial(auto)
  // Official rules that never mention promotion don't forbid it; pinned posts that don't say tell us nothing.
  if (auto.promo_policy === 'unknown' && !official) return null
  const policy = auto.promo_policy === 'unknown' ? null : auto.promo_policy
  const silent = !policy
  return {
    name,
    promo_policy: policy ?? 'allowed_with_value',
    self_promo_thread: auto.self_promo_thread,
    min_karma: auto.min_karma,
    min_account_age_days: auto.min_account_age_days,
    links_allowed: auto.links_allowed,
    post_formats: [],
    cooldown_days: auto.cooldown_days ?? null,
    tags: [official ? 'official' : 'auto'],
    notes: silent ? [auto.notes, 'The rules don\'t mention self-promotion.'].filter(Boolean).join(' ') : auto.notes,
    last_verified: (at ?? new Date()).toISOString().slice(0, 10),
    source: `https://www.reddit.com/r/${name}/about/rules`,
    ...(official ? { official: auto.official } : {}),
  }
}

export interface ResolvedRules {
  rules: ResolvedSubredditRules | null
  source: RulesSource | null
  /** When the rules were last read from Reddit (official or pinned). */
  checkedAt: Date | null
}

/** Rules for many subs at once (official, then curated, then pinned posts). Keys are lowercase names. */
export async function resolveRulesMany(db: Db, names: string[]): Promise<Map<string, ResolvedRules>> {
  const out = new Map<string, ResolvedRules>()
  const all = [...new Set(names.map(normalizeSubreddit))]
  const rows = new Map<string, { autoRules: AutoRules | null, at: Date | null }>()
  for (let i = 0; i < all.length; i += 90) {
    const batch = await db.select({ name: schema.subreddits.name, autoRules: schema.subreddits.autoRules, at: schema.subreddits.autoRulesAt })
      .from(schema.subreddits).where(inArray(schema.subreddits.name, all.slice(i, i + 90)))
    for (const r of batch) rows.set(r.name, { autoRules: r.autoRules, at: r.at })
  }
  for (const name of all) {
    const row = rows.get(name)
    const auto = autoToRules(name, row?.autoRules, row?.at)
    const checkedAt = row?.at ?? null
    const curated = getRules(name)
    if (auto && hasOfficial(row?.autoRules)) out.set(name, { rules: auto, source: 'official', checkedAt })
    else if (curated) out.set(name, { rules: curated, source: 'curated', checkedAt })
    else if (auto) out.set(name, { rules: auto, source: 'auto', checkedAt })
    else out.set(name, { rules: null, source: null, checkedAt })
  }
  return out
}

export async function resolveRules(db: Db, name: string): Promise<ResolvedRules> {
  return (await resolveRulesMany(db, [name])).get(normalizeSubreddit(name))!
}

export interface ExtractedRules {
  rules: AutoRules
  description: string | null
  subscribers: number | null
  usage: { inputTokens: number, outputTokens: number }
}

const NO_USAGE = { inputTokens: 0, outputTokens: 0 }
const OFFICIAL_PROMPT_MAX = 12_000

/**
 * Read a sub's rules and extract what matters for promotion: its official
 * rules when a page fetcher is configured (one fetch of two URLs), plus its
 * pinned posts (up to three Reddit feed requests), then one small LLM call.
 * Store the result even when nothing is found so the sub isn't re-read
 * until the rules go stale.
 */
export async function extractAutoRules(http: Http, llm: Llm, subreddit: string, pages?: PageFetcher): Promise<ExtractedRules> {
  const name = normalizeSubreddit(subreddit)
  const empty: AutoRules = { promo_policy: 'unknown', self_promo_thread: null, links_allowed: null, min_karma: null, min_account_age_days: null, cooldown_days: null, notes: '', evidence: [] }

  let official: OfficialRule[] | undefined
  let subscribers: number | null = null
  let description: string | null = null
  if (pages) {
    const res = await readOfficialRules(pages, name)
    // Banned, private or no such sub: nothing to read anywhere.
    if (res.status === 'missing') return { rules: empty, description: null, subscribers: null, usage: NO_USAGE }
    // A fetch hiccup: try again next run rather than storing a half answer.
    if (res.status === 'failed') throw new Error(`official rules unavailable (${res.error})`)
    official = res.rules
    subscribers = res.about?.subscribers ?? null
    description = res.about?.description ?? null
  }

  // Pinned posts often name the weekly promo thread, which official rules rarely do.
  let xml = ''
  try {
    const res = await http.getText(hotPostsFeedUrl(name))
    xml = res.status === 'ok' ? res.body : ''
  }
  catch (error) {
    if (error instanceof HttpDeferredError || !official) throw error
  }
  description ??= xml ? parseFeedSubtitle(xml) : null
  const candidates = (xml ? parseRedditFeed(xml) : []).filter(p => RULES_TITLE.test(p.title)).slice(0, 4)
  if (!candidates.length && !official?.length) return { rules: { ...empty, ...(official ? { official } : {}) }, description, subscribers, usage: NO_USAGE }

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

  const officialBlock = official?.length
    ? `<official_rules>\n${official.map((r, i) => `${i + 1}. ${r.title}${r.kind !== 'all' ? ` (${r.kind === 'link' ? 'posts only' : 'comments only'})` : ''}\n${r.text}`).join('\n\n').slice(0, OFFICIAL_PROMPT_MAX)}\n</official_rules>`
    : ''
  const { data, usage } = await llm.generate({
    tier: 'fast',
    system: 'You read a subreddit\'s official rules and pinned posts and extract its rules about self-promotion: mentioning or linking your own product in posts and comments. The official rules are authoritative; pinned posts can add details such as the name of the promo thread. If they conflict, the official rules win. Only report what the text actually says; use null or "unknown" for anything not stated. Never guess from the subreddit topic. In notes, mention any rule that bans the kind of product being promoted or requires disclosure.',
    prompt: [
      `Subreddit: r/${name}${description ? `\nDescription: ${description}` : ''}`,
      officialBlock,
      ...posts.map(p => `<pinned_post title="${p.title.replace(/"/g, '\'')}">\n${p.text.slice(0, 3000)}\n</pinned_post>`),
    ].filter(Boolean).join('\n\n'),
    schema: AutoRulesSchema,
    maxTokens: 1500,
  })
  return {
    rules: { ...data, evidence: posts.map(p => p.title), ...(official ? { official } : {}) },
    description,
    subscribers,
    usage,
  }
}

export async function saveAutoRules(db: Db, name: string, found: { rules: AutoRules, description: string | null, subscribers?: number | null }, now: Date) {
  const extra = {
    ...(found.description ? { description: found.description } : {}),
    ...(found.subscribers != null ? { subscribers: found.subscribers } : {}),
  }
  await db.insert(schema.subreddits).values({ name, autoRules: found.rules, autoRulesAt: now, ...extra })
    .onConflictDoUpdate({ target: schema.subreddits.name, set: { autoRules: found.rules, autoRulesAt: now, ...extra } })
}

export async function subredditRow(db: Db, name: string) {
  return db.select().from(schema.subreddits).where(eq(schema.subreddits.name, normalizeSubreddit(name))).get()
}
