import posthog from 'posthog-js'

/** Product analytics for the hosted edition. Self-hosted instances never load PostHog. */
export default defineNuxtPlugin(() => {
  const { edition, posthogKey } = useRuntimeConfig().public
  if (edition !== 'cloud' || !posthogKey) return

  posthog.init(posthogKey, {
    api_host: '/ingest', // proxied by server/routes/ingest
    ui_host: 'https://us.posthog.com',
    capture_pageview: 'history_change',
    person_profiles: 'identified_only',
    // Uncaught browser errors and unhandled rejections → error tracking.
    capture_exceptions: true,
  })

  // Errors Vue/Nuxt catch themselves never reach window.onerror.
  const nuxtApp = useNuxtApp()
  nuxtApp.hook('vue:error', (error) => { posthog.captureException(error) })
  nuxtApp.hook('app:error', (error) => { posthog.captureException(error) })

  const { user } = useUserSession()
  watch(() => user.value?.id, (id, previous) => {
    if (id && user.value) posthog.identify(id, { email: user.value.email, name: user.value.name })
    else if (previous) posthog.reset()
  }, { immediate: true })
})
