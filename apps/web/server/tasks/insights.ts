import { runSubredditInsights } from '@mochiscout/core'

// Normally runs daily from the dispatcher; this lets an operator refresh pooled
// subreddit stats and rules on demand (npx nitro task run insights, or /_nitro/tasks/insights in dev).
export default defineTask({
  meta: { name: 'insights', description: 'Refresh pooled subreddit stats and read rules from pinned posts' },
  async run({ context }) {
    const env = getTaskEnv(context as { cloudflare?: { env?: unknown } })
    const result = await runSubredditInsights(createJobContext(env))
    await flushErrorReports()
    return { result }
  },
})
