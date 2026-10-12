import { PLANS } from '@mochiscout/core'

/** Plan catalogue for the billing and pricing pages. */
export default defineEventHandler((event) => {
  const env = getEnv(event)
  const finite = (n: number) => (Number.isFinite(n) ? n : null)
  return {
    billingConfigured: polarConfigured(env),
    plans: (['free', 'solo', 'pro'] as const).map(id => ({
      id,
      label: PLANS[id].label,
      price: PLANS[id].price,
      projects: finite(PLANS[id].projects),
      watchedSubreddits: finite(PLANS[id].watchedSubreddits),
      seats: finite(PLANS[id].seats),
      digest: PLANS[id].digest,
      researchEveryDays: PLANS[id].researchEveryDays,
      manualResearchPerMonth: finite(PLANS[id].manualResearchPerMonth),
      mcp: PLANS[id].mcp,
      autoReplies: PLANS[id].autoReplies,
      hotAlerts: PLANS[id].hotAlerts,
      draftsPerMonth: finite(PLANS[id].draftsPerMonth),
      sources: PLANS[id].sources,
    })),
  }
})
