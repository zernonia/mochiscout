import { ANGLES, checkTone, generateDraft, normalizeSubredditName, recordUsage } from '@social-radar/core'
import { schema } from '@social-radar/db'
import { LlmRefusalError } from '@social-radar/llm'
import { getRules } from '@social-radar/rules'
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
  const subreddit = normalizeSubredditName(body.subreddit)
  if (!subreddit) throw createError({ statusCode: 400, statusMessage: 'Not a valid subreddit name' })
  const promo = body.angle === 'showcase' ? true : body.promo
  const rules = getRules(subreddit) ?? null

  // Hard block (arch §7.6): no promo drafts for subs that forbid promotion.
  if (promo && rules?.promo_policy === 'none') {
    throw createError({ statusCode: 422, statusMessage: `r/${subreddit} does not allow self-promotion. Turn off the product mention or pick another subreddit.` })
  }

  let title = ''
  let text = ''
  let tone = null
  if (body.generate) {
    const llm = getLlm(getEnv(event))
    if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Start an empty draft instead, or set ANTHROPIC_API_KEY.' })
    try {
      const draft = await generateDraft(llm, { project, subreddit, rules, angle: body.angle, promo, topic: body.topic })
      title = draft.data.title
      text = draft.data.body
      const check = await checkTone(llm, { subreddit, rules, title, body: text, promo })
      tone = { level: check.level, issues: check.issues }
      await recordUsage(getDb(event), org.id, {
        llmInputTokens: draft.usage.inputTokens + check.usage.inputTokens,
        llmOutputTokens: draft.usage.outputTokens + check.usage.outputTokens,
      })
    }
    catch (error) {
      if (error instanceof LlmRefusalError) throw createError({ statusCode: 422, statusMessage: 'The model declined to write this draft.' })
      throw error
    }
  }

  const ctx = await draftCheckContext(event, user.id, org.id)
  const check = buildReport({ subreddit, title, body: text, promo }, ctx, tone)
  const [draft] = await getDb(event).insert(schema.drafts).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    subreddit,
    title,
    body: text,
    angle: body.angle,
    promo,
    check,
  }).returning()
  setResponseStatus(event, 201)
  return draft
})
