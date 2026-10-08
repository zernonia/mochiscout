import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { createDb } from '@social-radar/db'

export function getDb(event: RequestEvent) {
  return createDb(getEnv(event).DB)
}
