import { ANGLES } from '@mochiscout/core'
import { z } from 'zod'

const Body = z.object({
  subreddit: z.string().max(200),
  angle: z.enum(ANGLES),
  promo: z.boolean(),
  topic: z.string().trim().max(500).nullish(),
  /** false: start an empty draft to write by hand. */
  generate: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const { user, org, project } = await requireProject(event)
  const body = await readValidatedBody(event, Body.parse)
  const draft = await createDraft(getDb(event), getEnv(event), { userId: user.id, orgId: org.id, project }, body)
  setResponseStatus(event, 201)
  return draft
})
