import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './auth-schema'

export * from './auth-schema'

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)

export const orgs = sqliteTable('orgs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan', { enum: ['selfhost', 'free', 'solo', 'pro'] }).notNull().default('selfhost'),
  polarCustomerId: text('polar_customer_id'),
  createdAt: createdAt(),
}, t => [index('orgs_owner_id_idx').on(t.ownerId)])

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
  intentThreshold: integer('intent_threshold').notNull().default(60),
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
})

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
    status: text('status', { enum: ['new', 'replied', 'dismissed', 'saved'] }).notNull().default('new'),
    scoredAt: integer('scored_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  t => [
    primaryKey({ columns: [t.projectId, t.threadId] }),
    index('thread_scores_inbox_idx').on(t.projectId, t.status, t.intent),
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
  check: text('check_json', { mode: 'json' }),
  createdAt: createdAt(),
})

export const trackedPosts = sqliteTable('tracked_posts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  subreddit: text('subreddit'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['live', 'removed_mod', 'removed_spam', 'unknown'] }).notNull().default('unknown'),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
})

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

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull().unique(),
  label: text('label'),
  createdAt: createdAt(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
})
