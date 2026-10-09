import { runTick } from '@mochiscout/core'

// Runs on the single Cloudflare cron trigger (every 15 min) and runs whichever
// jobs are due this tick: inline, or fanned out to the JOBS queue when bound.
export default defineTask({
  meta: {
    name: 'dispatch',
    description: 'Cron dispatcher: run whichever jobs are due this tick',
  },
  async run({ context }) {
    const env = getTaskEnv(context as { cloudflare?: { env?: unknown } })
    const result = await runTick(createJobContext(env))
    return { result }
  },
})
