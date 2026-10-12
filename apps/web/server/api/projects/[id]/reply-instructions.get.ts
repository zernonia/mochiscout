import { DEFAULT_REPLY_INSTRUCTIONS } from '@mochiscout/core'

/** The project's reply instructions for AI drafts, and the default they replace. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  return {
    instructions: project.replyInstructions ?? DEFAULT_REPLY_INSTRUCTIONS,
    isDefault: !project.replyInstructions,
    default: DEFAULT_REPLY_INSTRUCTIONS,
  }
})
