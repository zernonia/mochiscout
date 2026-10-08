import type { H3Event } from 'h3'
import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  JOBS?: Queue
}

/** Cloudflare bindings for the current request. */
export function getEnv(event: H3Event): Env {
  const env = event.context.cloudflare?.env as Env | undefined
  if (!env?.DB) {
    throw createError({ statusCode: 500, statusMessage: 'Cloudflare bindings unavailable' })
  }
  return env
}
