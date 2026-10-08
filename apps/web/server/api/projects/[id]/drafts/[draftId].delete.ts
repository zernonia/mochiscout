import { eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { draft } = await requireDraft(event)
  await getDb(event).delete(schema.drafts).where(eq(schema.drafts.id, draft.id))
  setResponseStatus(event, 204)
  return null
})
