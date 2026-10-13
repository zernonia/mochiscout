import { assertCanCreateProject, assertSources } from '@mochiscout/core'
import { schema } from '@mochiscout/db'

export default defineEventHandler(async (event) => {
  const { user, org } = await requireUser(event)
  const input = await readValidatedBody(event, ProjectInput.parse)
  // A source this server can't read (X without an API key) is dropped, not saved as on.
  const available = availableSources(getEnv(event))
  input.sources = input.sources.filter(s => available.includes(s))
  await quota(assertCanCreateProject(getDb(event), org))
  await quota(() => assertSources(org, input.sources))
  const [project] = await getDb(event)
    .insert(schema.projects)
    .values({ id: crypto.randomUUID(), orgId: org.id, ...input })
    .returning()

  // The first feed is built by /kickstart while the user watches (the inbox calls it); scheduled jobs take over after.
  if (project) track(event, user.id, 'project_created', { project_id: project.id, sources: input.sources })

  setResponseStatus(event, 201)
  return project
})
