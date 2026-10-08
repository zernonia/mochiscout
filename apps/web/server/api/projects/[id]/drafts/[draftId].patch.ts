import { eq, schema } from '@social-radar/db'
import { z } from 'zod'

const Body = z.object({
  title: z.string().max(1000),
  body: z.string().max(40_000),
  promo: z.boolean(),
})

/** Save edits and re-run the deterministic checks (the tone check is cleared until re-run). */
export default defineEventHandler(async (event) => {
  const { user, org, draft } = await requireDraft(event)
  const input = await readValidatedBody(event, Body.parse)
  const promo = draft.angle === 'showcase' ? true : input.promo
  const check = buildReport(
    { subreddit: draft.subreddit, title: input.title, body: input.body, promo },
    await draftCheckContext(event, user.id, org.id),
  )
  const [row] = await getDb(event)
    .update(schema.drafts)
    .set({ title: input.title, body: input.body, promo, check })
    .where(eq(schema.drafts.id, draft.id))
    .returning()
  return row
})
