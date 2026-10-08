import { and, eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { org } = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const project = await getDb(event)
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.orgId, org.id)))
    .get()
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return project
})
