import { PLANS, QuotaError } from '@mochiscout/core'

/** Run a quota check; a hit becomes HTTP 402 with what the UI needs to offer an upgrade. */
export async function quota<T>(check: Promise<T> | (() => T)): Promise<T> {
  try {
    return typeof check === 'function' ? check() : await check
  }
  catch (error) {
    if (error instanceof QuotaError) {
      const to = error.upgradeTo
      throw createError({
        statusCode: 402,
        statusMessage: error.message,
        data: {
          upgrade: true,
          feature: error.feature,
          plan: error.plan,
          limit: error.limit,
          upgradeTo: to,
          upgradeToLabel: to ? PLANS[to].label : null,
          upgradeToPrice: to ? PLANS[to].price : null,
        },
      })
    }
    throw error
  }
}
