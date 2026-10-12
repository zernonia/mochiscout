import { DEFAULT_REPLY_INSTRUCTIONS, REPLY_INSTRUCTIONS_MAX } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({ instructions: z.string().max(REPLY_INSTRUCTIONS_MAX).nullable() })

/** Save the project's reply instructions. Null, empty or the default text resets to the default. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { instructions } = await readValidatedBody(event, Body.parse)
  const value = instructions?.trim() && instructions.trim() !== DEFAULT_REPLY_INSTRUCTIONS ? instructions.trim() : null
  await getDb(event).update(schema.projects).set({ replyInstructions: value }).where(eq(schema.projects.id, project.id))
  return { instructions: value ?? DEFAULT_REPLY_INSTRUCTIONS, isDefault: value === null }
})
