import { desc, eq, schema } from '@social-radar/db'

export default defineEventHandler(async (event) => {
  const { user, project } = await requireProject(event)
  const db = getDb(event)
  const [posts, account] = await Promise.all([
    db.select().from(schema.trackedPosts)
      .where(eq(schema.trackedPosts.projectId, project.id))
      .orderBy(desc(schema.trackedPosts.postedAt))
      .limit(100),
    db.select({
      username: schema.users.redditUsername,
      status: schema.users.redditAccountStatus,
      checkedAt: schema.users.redditCheckedAt,
    }).from(schema.users).where(eq(schema.users.id, user.id)).get(),
  ])
  return { posts, account }
})
