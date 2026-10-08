import { assertCanCreateProject, runDiscovery } from '@social-radar/core'
import { schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { org } = await requireUser(event)
  const input = await readValidatedBody(event, ProjectInput.parse)
  await quota(assertCanCreateProject(getDb(event), org))
  const [project] = await getDb(event)
    .insert(schema.projects)
    .values({ id: crypto.randomUUID(), orgId: org.id, ...input })
    .returning()

  // Kick off discovery so the subreddit map and inbox have something to show.
  const ctx = createJobContext(getEnv(event))
  if (ctx.search && project) {
    event.waitUntil(runDiscovery(ctx, { projectIds: [project.id] }).catch(error => ctx.log('discovery failed', { error: String(error) })))
  }

  setResponseStatus(event, 201)
  return project
})
