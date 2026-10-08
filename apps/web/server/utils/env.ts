import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  JOBS?: Queue

  // Secrets / vars (wrangler secrets in production, .dev.vars locally).
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
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
