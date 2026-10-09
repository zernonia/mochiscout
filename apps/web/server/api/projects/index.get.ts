import { desc, eq, schema } from '@mochiscout/db'

export default defineEventHandler(async (event) => {
  const { org } = await requireUser(event)
  return getDb(event)
    .select({ id: schema.projects.id, name: schema.projects.name, url: schema.projects.url, category: schema.projects.category })
    .from(schema.projects)
    .where(eq(schema.projects.orgId, org.id))
    .orderBy(desc(schema.projects.createdAt))
})
