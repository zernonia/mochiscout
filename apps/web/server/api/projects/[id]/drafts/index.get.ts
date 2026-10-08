import { desc, eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const rows = await getDb(event)
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.projectId, project.id))
    .orderBy(desc(schema.drafts.createdAt))
    .limit(100)
  return rows.map(d => ({ ...d, check: d.check as import('@social-radar/core').CheckReport | null }))
})
