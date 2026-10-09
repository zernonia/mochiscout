import type { Db } from '@mochiscout/db'
import { schema, sql } from '@mochiscout/db'

export interface UsageDelta {
  searches?: number
  llmInputTokens?: number
  llmOutputTokens?: number
  researchRuns?: number
}

/** Add to this month's usage row for an org (cost tracking from day one, arch §13). */
export async function recordUsage(db: Db, orgId: string, delta: UsageDelta, at = new Date()) {
  const period = at.toISOString().slice(0, 7)
  const values = {
    searches: delta.searches ?? 0,
    llmInputTokens: delta.llmInputTokens ?? 0,
    llmOutputTokens: delta.llmOutputTokens ?? 0,
    researchRuns: delta.researchRuns ?? 0,
  }
  await db
    .insert(schema.usage)
    .values({ orgId, period, ...values })
    .onConflictDoUpdate({
      target: [schema.usage.orgId, schema.usage.period],
      set: {
        searches: sql`${schema.usage.searches} + ${values.searches}`,
        llmInputTokens: sql`${schema.usage.llmInputTokens} + ${values.llmInputTokens}`,
        llmOutputTokens: sql`${schema.usage.llmOutputTokens} + ${values.llmOutputTokens}`,
        researchRuns: sql`${schema.usage.researchRuns} + ${values.researchRuns}`,
      },
    })
}
