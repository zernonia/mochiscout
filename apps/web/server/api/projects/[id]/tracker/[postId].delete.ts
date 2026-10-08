import { and, eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  await getDb(event).delete(schema.trackedPosts).where(and(
    eq(schema.trackedPosts.id, getRouterParam(event, 'postId')!),
    eq(schema.trackedPosts.projectId, project.id),
  ))
  setResponseStatus(event, 204)
  return null
})
