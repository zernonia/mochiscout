import type { NuxtApp } from '#app'

/**
 * Stale-while-revalidate for app data. A revisited page shows the last response for the
 * same request at once (no skeleton); plugins/revalidate.client.ts then refreshes what is
 * on screen in the background after each navigation.
 */
export function swrCachedData(key: string, nuxtApp: NuxtApp, ctx: { cause: string }) {
  // Explicit refreshes (after a mutation, or the background revalidation) must hit the network.
  if (ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook') return undefined
  return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
}

/** useLazyFetch with the cache above. Same signature and typing as useLazyFetch. */
export const useCachedFetch = ((url: Parameters<typeof useLazyFetch>[0], opts?: Record<string, unknown>) =>
  useLazyFetch(url, { getCachedData: swrCachedData, ...opts })) as typeof useLazyFetch
