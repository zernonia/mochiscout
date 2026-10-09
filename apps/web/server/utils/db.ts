import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { createDb } from '@mochiscout/db'

export function getDb(event: RequestEvent) {
  return createDb(getEnv(event).DB)
}
