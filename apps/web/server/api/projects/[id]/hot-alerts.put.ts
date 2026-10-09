import { assertHotAlerts } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({ enabled: z.boolean() })

/** Turn hot lead email alerts on or off for a project (Solo and Pro plans). */
export default defineEventHandler(async (event) => {
  const { project, org } = await requireProject(event)
  const { enabled } = await readValidatedBody(event, Body.parse)
  if (enabled) await quota(() => assertHotAlerts(org))
  await getDb(event).update(schema.projects).set({ hotAlerts: enabled }).where(eq(schema.projects.id, project.id))
  return { hotAlerts: enabled }
})
