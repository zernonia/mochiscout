import type { H3Event } from 'h3'
import { createDb } from '@social-radar/db'

export function getDb(event: H3Event) {
  return createDb(getEnv(event).DB)
}
