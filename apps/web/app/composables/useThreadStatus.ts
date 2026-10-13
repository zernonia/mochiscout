import { toast } from '@/lib/toast'

export type ThreadStatus = 'new' | 'saved' | 'replied' | 'dismissed'

const DONE: Record<ThreadStatus, string> = {
  new: 'Moved back to New',
  saved: 'Saved for later',
  replied: 'Marked as replied',
  dismissed: 'Dismissed',
}

/**
 * Reply, save and dismiss take effect on screen at once: the thread leaves
 * the list, the counts move, and the change is saved in the background with
 * an Undo toast. A failed save puts the thread back.
 */
export function useThreadStatus(projectId: MaybeRefOrGetter<string>) {
  // Saves for one thread run in order, so an Undo never overtakes the change it undoes.
  const queues = new Map<string, Promise<unknown>>()

  function save(threadId: string, status: ThreadStatus, dismissReason?: string | null) {
    const url: string = `/api/projects/${toValue(projectId)}/threads/${encodeURIComponent(threadId)}`
    const run = (queues.get(threadId) ?? Promise.resolve())
      .catch(() => {})
      .then(() => $fetch<unknown>(url as string, { method: 'PATCH', body: { status, dismissReason: dismissReason ?? undefined } }))
    queues.set(threadId, run)
    return run
  }

  return function change<T extends { id: string, dismissReason?: string | null }>(opts: {
    list: T[]
    thread: T
    from: ThreadStatus
    to: ThreadStatus
    reason?: string
    counts?: Partial<Record<ThreadStatus, number>>
  }) {
    const { list, thread, from, to, reason, counts } = opts
    if (from === to) return
    const index = list.findIndex(t => t.id === thread.id)
    const move = (a: ThreadStatus, b: ThreadStatus) => {
      if (!counts) return
      counts[a] = Math.max(0, (counts[a] ?? 0) - 1)
      counts[b] = (counts[b] ?? 0) + 1
    }
    let putBackDone = false
    const putBack = () => {
      if (putBackDone) return
      putBackDone = true
      if (!list.some(t => t.id === thread.id)) list.splice(Math.min(Math.max(index, 0), list.length), 0, thread)
      move(to, from)
    }

    if (index >= 0) list.splice(index, 1)
    move(from, to)

    const previousReason = thread.dismissReason
    toast.undoable(DONE[to], () => {
      putBack()
      save(thread.id, from, from === 'dismissed' ? previousReason : undefined)
        .then(() => refreshNuxtData('project-nav'))
        .catch(() => toast.error('Could not undo. Refresh and try again.'))
    })

    save(thread.id, to, reason)
      .then(() => refreshNuxtData('project-nav'))
      .catch((error) => {
        putBack()
        toast.error(apiErrorMessage(error, 'Could not update the thread'))
      })
  }
}
