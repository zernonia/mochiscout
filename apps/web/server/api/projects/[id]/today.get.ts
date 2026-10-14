import { buildToday, pendingResponses, PLANS, readyToPost } from '@mochiscout/core'

export default defineEventHandler(async (event) => {
  const { org, project } = await requireProject(event)
  const db = getDb(event)
  const [plan, ready, conversations] = await Promise.all([buildToday(db, project), readyToPost(db, project), pendingResponses(db, project.id)])
  // A drafted thread shows once, in the queue, not again under "answer these first".
  const queued = new Set(ready.map(t => t.id))
  return {
    ...plan,
    threads: plan.threads.filter(t => !queued.has(t.id)),
    ready,
    conversations,
    autoDrafts: { available: PLANS[org.plan].autoReplies, on: project.autoReply },
  }
})
