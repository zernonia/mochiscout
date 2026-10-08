import { checkTrackedPost } from '@social-radar/core'
import { and, eq, schema } from '@social-radar/db'
import { parseRedditThreadUrl } from '@social-radar/sources'
import { z } from 'zod'

const Body = z.object({
  url: z.string().trim().max(2048),
  promo: z.boolean().default(true),
  draftId: z.string().nullish(),
})

/** Track a post the user made: checked now and then every 12 hours. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const body = await readValidatedBody(event, Body.parse)
  const ref = parseRedditThreadUrl(body.url)
  if (!ref) throw createError({ statusCode: 400, statusMessage: 'Paste the link to your Reddit post (…/r/sub/comments/…).' })

  const db = getDb(event)
  const existing = await db.select({ id: schema.trackedPosts.id }).from(schema.trackedPosts)
    .where(and(eq(schema.trackedPosts.projectId, project.id), eq(schema.trackedPosts.threadId, ref.id))).get()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'That post is already tracked.' })

  let title: string | null = null
  if (body.draftId) {
    const draft = await db.select({ title: schema.drafts.title }).from(schema.drafts)
      .where(and(eq(schema.drafts.id, body.draftId), eq(schema.drafts.projectId, project.id))).get()
    title = draft?.title ?? null
  }

  const [post] = await db.insert(schema.trackedPosts).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    url: ref.url,
    threadId: ref.id,
    subreddit: ref.subreddit,
    title,
    draftId: body.draftId ?? null,
    promo: body.promo,
    postedAt: new Date(),
  }).returning()

  const ctx = createJobContext(getEnv(event), { budgetMs: 90_000 })
  event.waitUntil(checkTrackedPost(ctx, post!).catch(error => ctx.log('tracker check failed', { error: String(error) })))
  setResponseStatus(event, 201)
  return post
})
