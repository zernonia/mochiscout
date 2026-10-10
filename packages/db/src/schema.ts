import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { users } from './auth-schema'

export * from './auth-schema'

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)

export const orgs = sqliteTable('orgs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan', { enum: ['selfhost', 'free', 'solo', 'pro'] }).notNull().default('selfhost'),
  polarCustomerId: text('polar_customer_id'),
  polarSubscriptionId: text('polar_subscription_id'),
  /** Polar subscription status (active, past_due, canceled, …). */
  planStatus: text('plan_status'),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  createdAt: createdAt(),
}, t => [index('orgs_owner_id_idx').on(t.ownerId)])

/** Team seats: who can use an org. The owner is a member too. */
export const orgMembers = sqliteTable(
  'org_members',
  {
    orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  t => [
    primaryKey({ columns: [t.orgId, t.userId] }),
    index('org_members_user_idx').on(t.userId),
  ],
)

export const orgInvites = sqliteTable(
  'org_invites',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  t => [index('org_invites_email_idx').on(t.email)],
)

/** Cloud landing-page waitlist. */
export const waitlist = sqliteTable('waitlist', {
  email: text('email').primaryKey(),
  source: text('source'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  icp: text('icp'),
  problems: text('problems_json', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  keywords: text('keywords_json', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  competitors: text('competitors_json', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  /** ~30 phrases buyers use, generated at onboarding; queried on HN, Bluesky and other feed sources. */
  searchTerms: text('search_terms_json', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  /** Feed sources besides Reddit: hn, bluesky, x. */
  sources: text('sources_json', { mode: 'json' }).$type<('hn' | 'bluesky' | 'x')[]>().notNull().default(sql`'[]'`),
  intentThreshold: integer('intent_threshold').notNull().default(60),
  /** Draft a reply for every new inbox thread automatically (paid plans). */
  autoReply: integer('auto_reply', { mode: 'boolean' }).notNull().default(false),
  /** Email members when a hot lead appears (paid plans). */
  hotAlerts: integer('hot_alerts', { mode: 'boolean' }).notNull().default(true),
  lastHotAlertAt: integer('last_hot_alert_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
})

export const subreddits = sqliteTable('subreddits', {
  name: text('name').primaryKey(),
  subscribers: integer('subscribers'),
  rules: text('rules_json', { mode: 'json' }),
  rulesVersion: text('rules_version'),
  lastRssAt: integer('last_rss_at', { mode: 'timestamp' }),
  rssEtag: text('rss_etag'),
  refreshIntervalMin: integer('refresh_interval_min').notNull().default(60),
  /** Public description from the sub's feed. */
  description: text('description'),
  /** Rules read by the LLM from the sub's pinned posts, when there is no curated file. */
  autoRules: text('auto_rules_json', { mode: 'json' }).$type<AutoRules>(),
  autoRulesAt: integer('auto_rules_at', { mode: 'timestamp' }),
  /** Pooled, anonymous outcomes across all projects (see core/subreddits/insights). */
  stats: text('stats_json', { mode: 'json' }).$type<SubredditStats>(),
  statsAt: integer('stats_at', { mode: 'timestamp' }),
})

export interface AutoRules {
  promo_policy: 'none' | 'weekly_thread_only' | 'flair_only' | 'allowed_with_value' | 'allowed' | 'unknown'
  self_promo_thread: string | null
  links_allowed: 'none' | 'in_comments_only' | 'yes' | null
  min_karma: number | null
  min_account_age_days: number | null
  notes: string
  /** Titles of the posts the rules were read from. */
  evidence: string[]
}

export interface SubredditStats {
  /** Posts seen in the last 30 days. */
  posts30d: number
  /** Share of posts per UTC hour (24 values summing to ~1). */
  hours: number[]
  /** Posts asking for a tool or comparing products (any project, intent 60+), last 30 days. */
  buyingPosts30d: number
  /** Posts checked for removal, and how many were removed (moderation strictness). */
  checked: number
  removed: number
  /** Our users' own posts and replies here, and how many were removed. */
  ownPosts: number
  ownPostsRemoved: number
  ownReplies: number
  ownRepliesRemoved: number
  /** Replies that included a link, and how many of those were removed. */
  linkedReplies: number
  linkedRepliesRemoved: number
}

export const projectSubreddits = sqliteTable(
  'project_subreddits',
  {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    subreddit: text('subreddit').notNull().references(() => subreddits.name),
    fitScore: integer('fit_score'),
    watching: integer('watching', { mode: 'boolean' }).notNull().default(false),
  },
  t => [
    primaryKey({ columns: [t.projectId, t.subreddit] }),
    index('project_subreddits_watching_idx').on(t.subreddit).where(sql`${t.watching} = 1`),
  ],
)

export const threads = sqliteTable(
  'threads',
  {
    // Source-prefixed: reddit:t3_*, hn:123, bsky:at://…
    id: text('id').primaryKey(),
    platform: text('platform', { enum: ['reddit', 'hn', 'bluesky', 'x', 'web'] }).notNull(),
    // Subreddit for Reddit, null elsewhere.
    channel: text('channel'),
    title: text('title').notNull(),
    url: text('url').notNull(),
    author: text('author'),
    // Null when only seen in search results (no post date).
    createdUtc: integer('created_utc', { mode: 'timestamp' }),
    // Keep ≤ 500 chars.
    snippet: text('snippet'),
    engagement: text('engagement_json', { mode: 'json' }),
    source: text('source', { enum: ['rss', 'search', 'api', 'extension'] }).notNull(),
    searchRankFlag: integer('search_rank_flag', { mode: 'boolean' }).notNull().default(false),
    /** Whether a reply is still possible. Archived: too old (Reddit ~6 months, HN 2 weeks). */
    state: text('state', { enum: ['open', 'archived', 'locked', 'removed', 'deleted'] }).notNull().default('open'),
    /** Full post text (≤ 4000 chars), fetched before drafting. */
    body: text('body'),
    /** Top comments (≤ 8), fetched with the body. */
    comments: text('comments_json', { mode: 'json' }).$type<{ author: string | null, text: string, score?: number }[]>(),
    contextFetchedAt: integer('context_fetched_at', { mode: 'timestamp' }),
    ingestedAt: integer('ingested_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  t => [index('threads_channel_created_idx').on(t.channel, t.createdUtc)],
)

export const threadScores = sqliteTable(
  'thread_scores',
  {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    threadId: text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
    intent: integer('intent').notNull(),
    kind: text('kind', { enum: ['seeking_tool', 'comparison', 'complaint', 'pain', 'other'] }).notNull(),
    reason: text('reason'),
    replyAngle: text('reply_angle'),
    /** AI-drafted reply the user can edit, copy and post themselves. */
    replyDraft: text('reply_draft'),
    replyDraftedAt: integer('reply_drafted_at', { mode: 'timestamp' }),
    /** The model's draft before the user's edits: the difference teaches the founder's voice. */
    replyAiDraft: text('reply_ai_draft'),
    status: text('status', { enum: ['new', 'replied', 'dismissed', 'saved'] }).notNull().default('new'),
    statusChangedAt: integer('status_changed_at', { mode: 'timestamp' }),
    /** Why a thread was dismissed; fit reasons calibrate future scoring. */
    dismissReason: text('dismiss_reason', { enum: ['off_topic', 'not_buyer', 'already_answered', 'closed', 'other'] }),
    /** When a hot-lead alert went out for this thread. */
    alertedAt: integer('alerted_at', { mode: 'timestamp' }),
    /** The founder's posted reply, for survival tracking. */
    replyUrl: text('reply_url'),
    replyStatus: text('reply_status', { enum: ['live', 'removed', 'unknown'] }),
    replyCheckedAt: integer('reply_checked_at', { mode: 'timestamp' }),
    /** Short code in the tracking link (?ref=ms_<code>) for this thread. */
    refCode: text('ref_code'),
    scoredAt: integer('scored_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  t => [
    primaryKey({ columns: [t.projectId, t.threadId] }),
    index('thread_scores_inbox_idx').on(t.projectId, t.status, t.intent),
    uniqueIndex('thread_scores_ref_code_idx').on(t.refCode),
  ],
)

/** Threads that passed a project's prefilter and wait for LLM scoring. */
export const scoreQueue = sqliteTable(
  'score_queue',
  {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    threadId: text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
    /** Terms that matched, or ['search'] for threads found by the project's own searches. */
    matched: text('matched_json', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    queuedAt: integer('queued_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  t => [
    primaryKey({ columns: [t.projectId, t.threadId] }),
    index('score_queue_queued_idx').on(t.queuedAt),
  ],
)

export const painPoints = sqliteTable('pain_points', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  severity: integer('severity').notNull(),
  evidence: text('evidence_json', { mode: 'json' }),
  subreddits: text('subreddits_json', { mode: 'json' }).$type<string[]>(),
  runId: text('run_id').notNull(),
  createdAt: createdAt(),
})

export const drafts = sqliteTable('drafts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  subreddit: text('subreddit').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  angle: text('angle', { enum: ['story', 'lesson', 'question', 'showcase'] }).notNull(),
  /** Mentions the product: counts toward promo pacing. */
  promo: integer('promo', { mode: 'boolean' }).notNull().default(true),
  check: text('check_json', { mode: 'json' }),
  createdAt: createdAt(),
})

export const trackedPosts = sqliteTable('tracked_posts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  /** reddit:t3_<id> */
  threadId: text('thread_id'),
  subreddit: text('subreddit'),
  title: text('title'),
  draftId: text('draft_id'),
  /** Promo posts count toward cooldowns and the daily cap. */
  promo: integer('promo', { mode: 'boolean' }).notNull().default(true),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['live', 'removed', 'not_listed', 'unknown'] }).notNull().default('unknown'),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
}, t => [
  index('tracked_posts_project_idx').on(t.projectId, t.postedAt),
])

export const usage = sqliteTable(
  'usage',
  {
    orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    // YYYY-MM
    period: text('period').notNull(),
    searches: integer('searches').notNull().default(0),
    llmInputTokens: integer('llm_input_tokens').notNull().default(0),
    llmOutputTokens: integer('llm_output_tokens').notNull().default(0),
    researchRuns: integer('research_runs').notNull().default(0),
  },
  t => [primaryKey({ columns: [t.orgId, t.period] })],
)

/** Visits and sign-ups that arrived through a thread's tracking link, per day. */
export const refStats = sqliteTable(
  'ref_stats',
  {
    code: text('code').notNull(),
    day: text('day').notNull(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    visits: integer('visits').notNull().default(0),
    signups: integer('signups').notNull().default(0),
  },
  t => [
    primaryKey({ columns: [t.code, t.day] }),
    index('ref_stats_project_idx').on(t.projectId, t.day),
  ],
)

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  /** Who created it; the key acts as this user. */
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  /** SHA-256 of the key; the key itself is shown once and never stored. */
  hash: text('hash').notNull().unique(),
  /** First characters, to tell keys apart in the UI. */
  prefix: text('prefix'),
  label: text('label'),
  createdAt: createdAt(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
})
