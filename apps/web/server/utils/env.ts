import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types'
import type { Job } from '@mochiscout/core'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  JOBS?: Queue<Job>

  // Secrets / vars (wrangler secrets in production, .dev.vars locally).
  /** Public URL of the app (links in emails, Polar redirects). */
  APP_URL?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  ANTHROPIC_API_KEY?: string
  /** Optional, e.g. a Cloudflare AI Gateway URL ending in /anthropic. */
  ANTHROPIC_BASE_URL?: string
  LLM_FAST_MODEL?: string
  LLM_QUALITY_MODEL?: string
  SEARCH_PROVIDER?: 'tinyfish' | 'brave'
  TINYFISH_API_KEY?: string
  BRAVE_API_KEY?: string
  /** X API v2 bearer token (paid). Enables X as a feed source (Pro plan). */
  X_BEARER_TOKEN?: string
  /** Cloud billing (Polar). */
  POLAR_ACCESS_TOKEN?: string
  POLAR_WEBHOOK_SECRET?: string
  /** 'sandbox' to use sandbox-api.polar.sh. */
  POLAR_SERVER?: 'sandbox' | 'production'
  POLAR_PRODUCT_SOLO?: string
  POLAR_PRODUCT_PRO?: string
  /** server (default) | extension | search_only — see docs/arch.md §5. */
  READ_MODE?: 'server' | 'extension' | 'search_only'
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
