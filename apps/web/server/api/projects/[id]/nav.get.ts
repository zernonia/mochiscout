import { inboxCounts } from '@mochiscout/core'
import { and, count, eq, inArray, schema } from '@mochiscout/db'

/** Small counts for the sidebar: what needs attention in this project. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const db = getDb(event)
  const [{ counts, pendingScoring }, [drafts], [watching], [alerts]] = await Promise.all([
    inboxCounts(db, project),
    db.select({ n: count() }).from(schema.drafts).where(eq(schema.drafts.projectId, project.id)),
    db.select({ n: count() }).from(schema.projectSubreddits)
      .where(and(eq(schema.projectSubreddits.projectId, project.id), eq(schema.projectSubreddits.watching, true))),
    db.select({ n: count() }).from(schema.trackedPosts)
      .where(and(eq(schema.trackedPosts.projectId, project.id), inArray(schema.trackedPosts.status, ['removed', 'not_listed']))),
  ])
  return {
    newThreads: counts.new,
    pendingScoring,
    drafts: drafts?.n ?? 0,
    watching: watching?.n ?? 0,
    trackerAlerts: alerts?.n ?? 0,
  }
})
