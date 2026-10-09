import { isClosed, listThreads, setThreadStatus } from '@mochiscout/core'

/** Clear every new thread that can't be answered any more (archived, locked, removed). */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const db = getDb(event)
  const threads = await listThreads(db, project, { status: 'new', limit: 100 })
  const closed = threads.filter(t => isClosed(t.state))
  await Promise.all(closed.map(t => setThreadStatus(db, project.id, t.id, 'dismissed', 'closed')))
  return { dismissed: closed.length }
})
