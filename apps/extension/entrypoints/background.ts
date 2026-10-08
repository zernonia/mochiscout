import type { PagePost } from '../utils/parse'
import { settingsItem, statsItem } from '../utils/settings'

const BATCH_MS = 5000
const MAX_BATCH = 100

// Batches posts from content scripts and sends them to the user's instance.
export default defineBackground(() => {
  let queue: PagePost[] = []
  let timer: ReturnType<typeof setTimeout> | undefined

  async function flush() {
    timer = undefined
    const settings = await settingsItem.getValue()
    if (!settings || !queue.length) return
    const batch = queue.splice(0, MAX_BATCH)
    const stats = await statsItem.getValue()
    try {
      const res = await fetch(new URL('/api/ingest', settings.instanceUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ posts: batch }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      await statsItem.setValue({ sent: stats.sent + batch.length, lastSentAt: new Date().toISOString(), lastError: null })
    }
    catch (error) {
      await statsItem.setValue({ ...stats, lastError: String(error) })
    }
    if (queue.length) timer = setTimeout(flush, BATCH_MS)
  }

  browser.runtime.onMessage.addListener((message: { type?: string, posts?: PagePost[] }) => {
    if (message.type !== 'posts' || !Array.isArray(message.posts)) return
    queue.push(...message.posts)
    // Bound memory if the instance is unreachable.
    if (queue.length > 1000) queue = queue.slice(-1000)
    timer ??= setTimeout(flush, BATCH_MS)
  })
})
