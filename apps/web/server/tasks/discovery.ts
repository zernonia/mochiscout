import { runDiscovery } from '@social-radar/core'

// Also runs from the dispatcher every 6 h; this task allows a manual run.
export default defineTask({
  meta: {
    name: 'discovery',
    description: 'Run search-provider discovery for every project now',
  },
  async run({ context }) {
    const env = getTaskEnv(context as { cloudflare?: { env?: unknown } })
    return { result: await runDiscovery(createJobContext(env)) }
  },
})
