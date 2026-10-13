import { assertSources } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'

/** Edit a project's profile, search terms and feed sources. */
export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const body = await readBody<Record<string, unknown> | null>(event)
  const parsed = ProjectInput.partial().parse(body ?? {})
  // .partial() still fills .default([]) for fields left out: only update what was sent.
  const input = Object.fromEntries(Object.entries(parsed).filter(([k]) => body && k in body)) as typeof parsed
  if (input.sources) await quota(() => assertSources(org, input.sources!))
  if (!Object.keys(input).length) return project
  const [row] = await getDb(event)
    .update(schema.projects)
    .set(input)
    .where(eq(schema.projects.id, project.id))
    .returning()
  return row
})
