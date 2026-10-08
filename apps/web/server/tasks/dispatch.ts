// Runs on the single Cloudflare cron trigger (every 15 min). Decides which jobs
// are due (plan-fetch, search-discovery, digest, tracker, retention) and runs them
// inline or enqueues them on JOBS. Jobs land in later Phase 1 steps.
export default defineTask({
  meta: {
    name: 'dispatch',
    description: 'Cron dispatcher: run whichever jobs are due this tick',
  },
  async run({ context }) {
    const scheduledTime = (context as { scheduledTime?: number }).scheduledTime ?? Date.now()
    console.info('[dispatch] tick', new Date(scheduledTime).toISOString())
    return { result: { ran: [] as string[] } }
  },
})
