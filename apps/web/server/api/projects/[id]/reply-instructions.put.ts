import { DEFAULT_REPLY_INSTRUCTIONS, REPLY_FACTS_MAX, REPLY_INSTRUCTIONS_MAX } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({
  instructions: z.string().max(REPLY_INSTRUCTIONS_MAX).nullable().optional(),
  /** What only the founder knows: story, numbers, pricing, how it differs. */
  facts: z.string().max(REPLY_FACTS_MAX).nullable().optional(),
}).refine(b => b.instructions !== undefined || b.facts !== undefined, 'Nothing to update')

/** Save the project's reply instructions (null, empty or the default text resets to the default) and/or facts. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const body = await readValidatedBody(event, Body.parse)
  const set: { replyInstructions?: string | null, replyFacts?: string | null } = {}
  if (body.instructions !== undefined) {
    const text = body.instructions?.trim()
    set.replyInstructions = text && text !== DEFAULT_REPLY_INSTRUCTIONS ? text : null
  }
  if (body.facts !== undefined) set.replyFacts = body.facts?.trim() || null
  await getDb(event).update(schema.projects).set(set).where(eq(schema.projects.id, project.id))
  const instructions = set.replyInstructions !== undefined ? set.replyInstructions : project.replyInstructions
  return {
    instructions: instructions ?? DEFAULT_REPLY_INSTRUCTIONS,
    isDefault: !instructions,
    facts: (set.replyFacts !== undefined ? set.replyFacts : project.replyFacts) ?? '',
  }
})
