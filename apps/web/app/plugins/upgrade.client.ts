export interface UpgradePrompt {
  message: string
  feature: string
  plan: string
  upgradeTo: string | null
  upgradeToLabel: string | null
  upgradeToPrice: number | null
}

/**
 * Any API response with HTTP 402 opens the upgrade sheet (UpgradeSheet.vue).
 * Wraps window.fetch because $fetch is a module import in Nuxt 4, not a global
 * that could be replaced.
 */
export default defineNuxtPlugin(() => {
  const prompt = useState<UpgradePrompt | null>('upgrade-prompt', () => null)
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await original(input, init)
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (res.status === 402 && new URL(url, location.origin).pathname.startsWith('/api/')) {
      res.clone().json().then((body: { statusMessage?: string, data?: Omit<UpgradePrompt, 'message'> }) => {
        if (body?.data) prompt.value = { message: body.statusMessage ?? 'This needs a bigger plan.', ...body.data }
      }).catch(() => {})
    }
    return res
  }
})
