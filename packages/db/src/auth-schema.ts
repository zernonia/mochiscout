import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Users and their sign-in methods: providerId 'credential' (password hash), 'github' or 'google'.
// Sessions are sealed cookies (nuxt-auth-utils), so there is no sessions table.

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  timezone: text('timezone').notNull().default('UTC'),
  digestHour: integer('digest_hour').notNull().default(8),
  redditUsername: text('reddit_username'),
  /** Self-reported, used by the drafter's karma/age checks. */
  redditKarma: integer('reddit_karma'),
  redditAccountCreatedAt: integer('reddit_account_created_at', { mode: 'timestamp' }),
  /** Last public-profile check: ok, or not_found (suspended, shadowbanned or deleted). */
  redditAccountStatus: text('reddit_account_status', { enum: ['ok', 'not_found', 'unknown'] }),
  redditCheckedAt: integer('reddit_checked_at', { mode: 'timestamp' }),
  lastDigestAt: integer('last_digest_at', { mode: 'timestamp' }),
  ...timestamps,
})

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  t => [index('accounts_user_id_idx').on(t.userId)],
)
