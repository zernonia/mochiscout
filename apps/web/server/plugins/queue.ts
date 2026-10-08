import type { MessageBatch } from '@cloudflare/workers-types'
import type { Job } from '@social-radar/core'
import { runJob } from '@social-radar/core'
import { HttpDeferredError } from '@social-radar/sources'

// Consumer for the optional JOBS queue (cloud). Configure the consumer with
// max_concurrency: 1 so reddit.com requests stay serialized.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const ctx = createJobContext(getTaskEnv({ cloudflare: { env } }), { budgetMs: 5 * 60_000 })
    for (const message of (batch as MessageBatch<Job>).messages) {
      try {
        await runJob(ctx, message.body)
        message.ack()
      }
      catch (error) {
        const delaySeconds = error instanceof HttpDeferredError
          ? Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000))
          : undefined
        ctx.log('queue job failed', { job: message.body, error: String(error), delaySeconds })
        message.retry(delaySeconds ? { delaySeconds } : undefined)
      }
    }
  })
})
