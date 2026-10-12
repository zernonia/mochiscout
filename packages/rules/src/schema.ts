import { z } from 'zod'

export const PROMO_POLICIES = ['none', 'weekly_thread_only', 'flair_only', 'allowed_with_value', 'allowed'] as const
export const LINKS_ALLOWED = ['none', 'in_comments_only', 'yes'] as const
export const POST_FORMATS = ['text', 'link', 'image', 'video'] as const

/** One of the sub's own rules, verbatim from its rules page. */
export const OfficialRule = z.object({
  title: z.string().min(1),
  text: z.string(),
  kind: z.enum(['all', 'link', 'comment']),
}).strict()
export type OfficialRule = z.infer<typeof OfficialRule>

/**
 * One community-maintained file per subreddit (packages/rules/subreddits/<name>.yaml).
 * Unknown values are `null` rather than guessed: many subs enforce karma and
 * account-age minimums through AutoModerator without publishing them.
 */
export const SubredditRules = z.object({
  name: z.string().regex(/^\w{2,21}$/, 'Subreddit name without r/'),
  promo_policy: z.enum(PROMO_POLICIES),
  self_promo_thread: z.string().min(1).nullable().default(null),
  min_karma: z.number().int().nonnegative().nullable().default(null),
  min_account_age_days: z.number().int().nonnegative().nullable().default(null),
  links_allowed: z.enum(LINKS_ALLOWED).nullable().default(null),
  post_formats: z.array(z.enum(POST_FORMATS)).default([]),
  cooldown_days: z.number().int().positive().nullable().default(null),
  tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
  notes: z.string().default(''),
  last_verified: z.iso.date(),
  /** The sub's own rules, verbatim (written by `pnpm rules:sync`). */
  official: z.array(OfficialRule).default([]),
  /** Fields a person corrected by hand, which `pnpm rules:sync` leaves alone. */
  keep: z.array(z.enum(['promo_policy', 'self_promo_thread', 'min_karma', 'min_account_age_days', 'links_allowed', 'post_formats', 'cooldown_days', 'tags', 'notes'])).default([]),
  source: z.url().refine(u => /^https:\/\/(www\.|old\.)?reddit\.com\/r\/\w+\/(about\/rules|wiki\/)/.test(u), 'Link to the subreddit rules or wiki page'),
}).strict()

export type SubredditRules = z.infer<typeof SubredditRules>
