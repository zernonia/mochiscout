import { bestPostingTime } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'

export default defineEventHandler(async (event) => {
  const { draft } = await requireDraft(event)
  const sub = await getDb(event).select({ stats: schema.subreddits.stats }).from(schema.subreddits)
    .where(eq(schema.subreddits.name, draft.subreddit.toLowerCase())).get()
  return { ...draft, timing: bestPostingTime(sub?.stats) }
})
