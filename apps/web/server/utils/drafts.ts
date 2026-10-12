import type { Angle, CheckReport, DraftInput } from '@mochiscout/core'
import type { Db } from '@mochiscout/db'
import type { Env } from './env'
import { assertCanDraft, checkDraft, checkTone, generateDraft, normalizeSubredditName, recordUsage, resolveRules, worst } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { LlmRefusalError } from '@mochiscout/llm'

type Project = typeof schema.projects.$inferSelect

/** The sub's rules (curated or read from pinned posts), the user's Reddit account info and the org's post history, for rule checks. */
export async function draftCheckContext(db: Db, userId: string, orgId: string, subreddit: string) {
  const [user, history, resolved] = await Promise.all([
    db.select().from(schema.users).where(eq(schema.users.id, userId)).get(),
    db
      .select({ subreddit: schema.trackedPosts.subreddit, postedAt: schema.trackedPosts.postedAt, promo: schema.trackedPosts.promo })
      .from(schema.trackedPosts)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.trackedPosts.projectId))
      .where(eq(schema.projects.orgId, orgId)),
    resolveRules(db, subreddit),
  ])
  return {
    rules: resolved.rules,
    account: {
      karma: user?.redditKarma ?? null,
      createdAt: user?.redditAccountCreatedAt ?? null,
      status: user?.redditAccountStatus ?? null,
    },
    history,
  }
}

export function buildReport(
  draft: DraftInput,
  ctx: Awaited<ReturnType<typeof draftCheckContext>>,
  tone: CheckReport['tone'] = null,
): CheckReport {
  const results = checkDraft({ draft, rules: ctx.rules, account: ctx.account, history: ctx.history, now: new Date() })
  return {
    level: worst([...results.map(r => r.level), ...(tone ? [tone.level] : [])]),
    results,
    tone,
    checkedAt: new Date().toISOString(),
  }
}

/** Create a draft (generated, or empty to write by hand) with its rule-check report. */
export async function createDraft(db: Db, env: Env, ctx: { userId: string, orgId: string, project: Project }, input: {
  subreddit: string
  angle: Angle
  promo: boolean
  topic?: string | null
  generate: boolean
}) {
  const subreddit = normalizeSubredditName(input.subreddit)
  if (!subreddit) throw createError({ statusCode: 400, statusMessage: 'Not a valid subreddit name' })
  const promo = input.angle === 'showcase' ? true : input.promo
  const { rules } = await resolveRules(db, subreddit)

  // Hard block (arch §7.6): no promo drafts for subs that forbid promotion.
  if (promo && rules?.promo_policy === 'none') {
    throw createError({ statusCode: 422, statusMessage: `r/${subreddit} does not allow self-promotion. Turn off the product mention or pick another subreddit.` })
  }

  let title = ''
  let body = ''
  let tone: CheckReport['tone'] = null
  if (input.generate) {
    const llm = getLlm(env)
    if (!llm) throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Start an empty draft instead, or set ANTHROPIC_API_KEY.' })
    const org = await db.select({ id: schema.orgs.id, plan: schema.orgs.plan }).from(schema.orgs).where(eq(schema.orgs.id, ctx.orgId)).get()
    if (org) await quota(assertCanDraft(db, org))
    try {
      const draft = await generateDraft(llm, { project: ctx.project, subreddit, rules, angle: input.angle, promo, topic: input.topic })
      title = draft.data.title
      body = draft.data.body
      const check = await checkTone(llm, { subreddit, rules, title, body, promo })
      tone = { level: check.level, issues: check.issues }
      await recordUsage(db, ctx.orgId, {
        llmInputTokens: draft.usage.inputTokens + check.usage.inputTokens,
        llmOutputTokens: draft.usage.outputTokens + check.usage.outputTokens,
        drafts: 1,
      })
    }
    catch (error) {
      if (error instanceof LlmRefusalError) throw createError({ statusCode: 422, statusMessage: 'The model declined to write this draft.' })
      throw error
    }
  }

  const check = buildReport({ subreddit, title, body, promo }, await draftCheckContext(db, ctx.userId, ctx.orgId, subreddit), tone)
  const [draft] = await db.insert(schema.drafts).values({
    id: crypto.randomUUID(),
    projectId: ctx.project.id,
    subreddit,
    title,
    body,
    angle: input.angle,
    promo,
    check,
  }).returning()
  return draft!
}
