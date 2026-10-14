import { buildToday, pendingResponses, PLANS, readyToPost } from '@mochiscout/core'
import { and, eq, schema } from '@mochiscout/db'

export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const db = getDb(event)
  const ts = schema.threadScores
  const [plan, ready, conversations, replied] = await Promise.all([
    buildToday(db, project),
    readyToPost(db, project),
    pendingResponses(db, project.id),
    db.select({ id: ts.threadId }).from(ts).where(and(eq(ts.projectId, project.id), eq(ts.status, 'replied'))).limit(1).get(),
  ])
  // A drafted thread shows once, in the queue, not again under "answer these first".
  const queued = new Set(ready.map(t => t.id))
  return {
    ...plan,
    threads: plan.threads.filter(t => !queued.has(t.id)),
    ready,
    conversations,
    autoDrafts: { available: PLANS[org.plan].autoReplies, on: project.autoReply },
    /** Pacing stats mean little before the first posted reply. */
    hasReplied: !!replied,
  }
})
