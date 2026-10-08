import { drizzle } from 'drizzle-orm/d1'
import type { D1Database } from '@cloudflare/workers-types'
import * as schema from './schema'

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type Db = ReturnType<typeof createDb>
export { schema }
export * from './schema'

// Re-export query helpers so apps share this package's drizzle-orm instance.
export { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, lte, ne, not, or, sql } from 'drizzle-orm'
