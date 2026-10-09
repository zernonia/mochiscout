import type { SubredditRules } from '@mochiscout/rules'

export type CheckLevel = 'pass' | 'warn' | 'fail'

export interface CheckResult {
  id: string
  level: CheckLevel
  message: string
}

export interface CheckReport {
  level: CheckLevel
  results: CheckResult[]
  /** LLM tone check, when one has run. */
  tone?: { level: CheckLevel, issues: string[] } | null
  checkedAt: string
}

export interface DraftInput {
  subreddit: string
  title: string
  body: string
  /** Mentions the product. */
  promo: boolean
}

export interface AccountInfo {
  karma: number | null
  createdAt: Date | null
  status: 'ok' | 'not_found' | 'unknown' | null
}

export interface PostHistoryItem {
  subreddit: string | null
  postedAt: Date | null
  promo: boolean
}

export const DEFAULT_COOLDOWN_DAYS = 7
export const MAX_PROMO_POSTS_PER_DAY = 1
const TITLE_MAX = 300
const DAY_MS = 86_400_000
const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+\.\w{2,}/gi

export function worst(levels: CheckLevel[]): CheckLevel {
  return levels.includes('fail') ? 'fail' : levels.includes('warn') ? 'warn' : 'pass'
}

/**
 * Deterministic rule checks (arch §7.4-7.6): promo policy, links, format,
 * karma/age minimums, per-sub cooldown, daily promo cap. No LLM involved.
 */
export function checkDraft(opts: {
  draft: DraftInput
  rules: SubredditRules | null
  account: AccountInfo
  history: PostHistoryItem[]
  now: Date
}): CheckResult[] {
  const { draft, rules, account, history, now } = opts
  const out: CheckResult[] = []
  const add = (id: string, level: CheckLevel, message: string) => out.push({ id, level, message })
  const sub = `r/${draft.subreddit}`

  if (account.status === 'not_found') {
    add('account', 'fail', 'Your Reddit profile is not publicly visible: the account may be suspended or shadowbanned. Posts would not be seen.')
  }

  // Promo policy
  if (!rules) {
    add('rules', 'warn', `${sub} is not in the rules DB yet. Read its rules and sidebar before posting.`)
  }
  else if (draft.promo) {
    switch (rules.promo_policy) {
      case 'none':
        add('promo', 'fail', `${sub} does not allow self-promotion. Remove the product mention or pick another subreddit.`)
        break
      case 'weekly_thread_only':
        add('promo', 'fail', `${sub} only allows promotion in ${rules.self_promo_thread ? `"${rules.self_promo_thread}"` : 'its promo thread'}.`)
        break
      case 'flair_only':
        add('promo', 'warn', `${sub} allows promotion only with the right post flair. Set it when posting.`)
        break
      case 'allowed_with_value':
        add('promo', 'pass', `${sub} allows promotion when the post is valuable on its own.`)
        break
      case 'allowed':
        add('promo', 'pass', `${sub} allows promotion.`)
        break
    }
  }
  else {
    add('promo', 'pass', 'No product mention: not a promo post.')
  }

  // Links
  const links = `${draft.title}\n${draft.body}`.match(URL_RE) ?? []
  if (links.length) {
    const allowed = rules?.links_allowed ?? null
    if (allowed === 'none') add('links', 'fail', `${sub} does not allow links. Remove ${links.length === 1 ? 'the link' : `${links.length} links`}.`)
    else if (allowed === 'in_comments_only') add('links', 'fail', `${sub} allows links only in comments. Move the link to a comment after posting.`)
    else if (allowed === null) add('links', 'warn', 'Links often trigger spam filters for newer accounts. Consider leaving them out.')
    else add('links', 'pass', 'Links are allowed.')
  }

  // Format
  if (rules?.post_formats.length && !rules.post_formats.includes('text')) {
    add('format', 'warn', `${sub} usually expects ${rules.post_formats.join(' or ')} posts, not text.`)
  }
  if (!draft.title.trim()) add('title', 'fail', 'Add a title.')
  else if (draft.title.length > TITLE_MAX) add('title', 'fail', `Title is ${draft.title.length} characters; Reddit allows ${TITLE_MAX}.`)
  if (!draft.body.trim()) add('body', 'warn', 'The body is empty.')

  // Karma and account age
  if (rules?.min_karma != null) {
    if (account.karma == null) add('karma', 'warn', `${sub} requires ${rules.min_karma}+ karma. Add your karma in Settings to check.`)
    else if (account.karma < rules.min_karma) add('karma', 'fail', `${sub} requires ${rules.min_karma}+ karma; you have ${account.karma}.`)
  }
  if (rules?.min_account_age_days != null) {
    if (!account.createdAt) {
      add('age', 'warn', `${sub} requires accounts older than ${rules.min_account_age_days} days. Add your account date in Settings to check.`)
    }
    else {
      const ageDays = Math.floor((now.getTime() - account.createdAt.getTime()) / DAY_MS)
      if (ageDays < rules.min_account_age_days) add('age', 'fail', `${sub} requires accounts older than ${rules.min_account_age_days} days; yours is ${ageDays}.`)
    }
  }

  // Pacing: per-sub cooldown and daily cap (promo posts only)
  if (draft.promo) {
    const cooldown = rules?.cooldown_days ?? DEFAULT_COOLDOWN_DAYS
    const lastHere = history
      .filter(h => h.promo && h.postedAt && h.subreddit === draft.subreddit)
      .sort((a, b) => b.postedAt!.getTime() - a.postedAt!.getTime())[0]
    if (lastHere?.postedAt) {
      const nextAt = new Date(lastHere.postedAt.getTime() + cooldown * DAY_MS)
      if (nextAt > now) add('cooldown', 'fail', `You promoted in ${sub} on ${lastHere.postedAt.toISOString().slice(0, 10)}. Wait until ${nextAt.toISOString().slice(0, 10)} (${cooldown}-day gap).`)
    }
    const today = history.filter(h => h.promo && h.postedAt && now.getTime() - h.postedAt.getTime() < DAY_MS).length
    if (today >= MAX_PROMO_POSTS_PER_DAY) add('daily', 'fail', `You already made ${today} promo post${today > 1 ? 's' : ''} in the last 24 hours (limit ${MAX_PROMO_POSTS_PER_DAY}).`)
  }

  return out
}
