import { and, count, eq, gte, isNotNull, schema } from '@mochiscout/db'

/** Progress through the first-reply checklist (leads → draft → replied → link). */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const db = getDb(event)
  const ts = schema.threadScores
  const mine = eq(ts.projectId, project.id)
  const n = async (where: ReturnType<typeof and>) => (await db.select({ n: count() }).from(ts).where(where))[0]?.n ?? 0
  const [leads, drafted, replied, linked, posts] = await Promise.all([
    n(and(mine, gte(ts.intent, project.intentThreshold))),
    n(and(mine, isNotNull(ts.replyDraft))),
    n(and(mine, eq(ts.status, 'replied'))),
    n(and(mine, isNotNull(ts.replyUrl))),
    db.select({ n: count() }).from(schema.drafts).where(eq(schema.drafts.projectId, project.id)).then(r => r[0]?.n ?? 0),
  ])
  return { leads: leads > 0, drafted: drafted + posts > 0, replied: replied > 0, linked: linked > 0 }
})
