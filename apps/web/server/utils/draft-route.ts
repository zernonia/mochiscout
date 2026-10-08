import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { CheckReport } from '@social-radar/core'
import { and, eq, schema } from '@social-radar/db'

/** The draft in the route, scoped to the user's project. */
export async function requireDraft(event: RequestEvent) {
  const ctx = await requireProject(event)
  const draftId = getRouterParam(event, 'draftId')!
  const draft = await getDb(event)
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.id, draftId), eq(schema.drafts.projectId, ctx.project.id)))
    .get()
  if (!draft) throw createError({ statusCode: 404, statusMessage: 'Draft not found' })
  return { ...ctx, draft: { ...draft, check: draft.check as CheckReport | null } }
}
