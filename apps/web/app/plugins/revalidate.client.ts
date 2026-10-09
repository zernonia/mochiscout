/** Background revalidation for useCachedFetch: refresh visible data after each client navigation. */
export default defineNuxtPlugin((nuxtApp) => {
  let hydrated = false
  nuxtApp.hook('page:finish', () => {
    // The first page:finish is hydration, whose data the server just fetched.
    if (!hydrated) {
      hydrated = true
      return
    }
    refreshNuxtData()
  })
})
