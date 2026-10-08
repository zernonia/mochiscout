import { schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { org } = await requireUser(event)
  const input = await readValidatedBody(event, ProjectInput.parse)
  const [project] = await getDb(event)
    .insert(schema.projects)
    .values({ id: crypto.randomUUID(), orgId: org.id, ...input })
    .returning()
  setResponseStatus(event, 201)
  return project
})
