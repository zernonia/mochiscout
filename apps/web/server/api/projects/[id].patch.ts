import { assertSources } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'

/** Edit a project's profile, search terms and feed sources. */
export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const input = await readValidatedBody(event, ProjectInput.partial().parse)
  if (input.sources) await quota(() => assertSources(org, input.sources!))
  const [row] = await getDb(event)
    .update(schema.projects)
    .set(input)
    .where(eq(schema.projects.id, project.id))
    .returning()
  return row
})
