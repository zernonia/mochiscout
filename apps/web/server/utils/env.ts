import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types'
import type { Job } from '@social-radar/core'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  JOBS?: Queue<Job>

  // Secrets / vars (wrangler secrets in production, .dev.vars locally).
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  SEARCH_PROVIDER?: 'tinyfish' | 'brave'
  TINYFISH_API_KEY?: string
  BRAVE_API_KEY?: string
  /** Contact URL in the User-Agent sent to reddit.com and other sources. */
  CONTACT_URL?: string
  /** Self-host: comma-separated emails allowed to sign up after the first user. */
  ALLOWED_EMAILS?: string
}

/** Cloudflare bindings for the current request. */
export function getEnv(event: RequestEvent): Env {
  const env = event.context.cloudflare?.env as Env | undefined
  if (!env?.DB) {
    throw createError({ statusCode: 500, statusMessage: 'Cloudflare bindings unavailable' })
  }
  return env
}
