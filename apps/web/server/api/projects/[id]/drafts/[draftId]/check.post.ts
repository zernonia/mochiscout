import { checkTone, recordUsage } from '@social-radar/core'
import { eq, schema } from '@social-radar/db'
import { LlmRefusalError } from '@social-radar/llm'
import { getRules } from '@social-radar/rules'

/** Full check: deterministic rules plus the LLM tone check when a key is set. */
export default defineEventHandler(async (event) => {
  const { user, org, draft } = await requireDraft(event)
  const llm = getLlm(getEnv(event))
  let tone = null
  if (llm && draft.title.trim() && draft.body.trim()) {
    try {
      const res = await checkTone(llm, {
        subreddit: draft.subreddit,
        rules: getRules(draft.subreddit) ?? null,
        title: draft.title,
        body: draft.body,
        promo: draft.promo,
      })
      tone = { level: res.level, issues: res.issues }
      await recordUsage(getDb(event), org.id, { llmInputTokens: res.usage.inputTokens, llmOutputTokens: res.usage.outputTokens })
    }
    catch (error) {
      if (!(error instanceof LlmRefusalError)) throw error
      tone = { level: 'warn' as const, issues: ['The model declined to review this draft.'] }
    }
  }
  const check = buildReport(
    { subreddit: draft.subreddit, title: draft.title, body: draft.body, promo: draft.promo },
    await draftCheckContext(getDb(event), user.id, org.id),
    tone,
  )
  const [row] = await getDb(event).update(schema.drafts).set({ check }).where(eq(schema.drafts.id, draft.id)).returning()
  return row
})
