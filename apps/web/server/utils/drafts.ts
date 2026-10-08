import type { CheckReport, DraftInput } from '@social-radar/core'
import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { checkDraft, worst } from '@social-radar/core'
import { eq, schema } from '@social-radar/db'
import { getRules } from '@social-radar/rules'

/** The signed-in user's Reddit account info and the org's post history, for rule checks. */
export async function draftCheckContext(event: RequestEvent, userId: string, orgId: string) {
  const db = getDb(event)
  const [user, history] = await Promise.all([
    db.select().from(schema.users).where(eq(schema.users.id, userId)).get(),
    db
      .select({ subreddit: schema.trackedPosts.subreddit, postedAt: schema.trackedPosts.postedAt, promo: schema.trackedPosts.promo })
      .from(schema.trackedPosts)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.trackedPosts.projectId))
      .where(eq(schema.projects.orgId, orgId)),
  ])
  return {
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
  const results = checkDraft({ draft, rules: getRules(draft.subreddit) ?? null, ...ctx, now: new Date() })
  return {
    level: worst([...results.map(r => r.level), ...(tone ? [tone.level] : [])]),
    results,
    tone,
    checkedAt: new Date().toISOString(),
  }
}
