/**
 * Dogfooding: mochiscout.com runs the same tracking script founders add to
 * their sites, so replies with a Mochiscout tracking link count visits and
 * sign-ups in the Mochiscout project's Results page.
 */
const SIGNUP_WINDOW_MS = 60 * 60 * 1000

export default defineNuxtPlugin(() => {
  const { edition, trackingProject } = useRuntimeConfig().public
  if (edition !== 'cloud' || !trackingProject) return

  useHead({ script: [{ src: '/t.js', defer: true, 'data-project': trackingProject }] })

  // Sign-ups finish on the server (password, magic link, GitHub, Google), so
  // report one the first time a brand-new account loads the app.
  const { user } = useUserSession()
  watch(() => user.value?.id, (id) => {
    const created = user.value?.createdAt
    if (!id || !created || Date.now() - created > SIGNUP_WINDOW_MS) return
    const key = `ms:signup-reported:${id}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    }
    catch {
      return
    }
    // The script loads deferred; give it a moment.
    let tries = 0
    const report = () => {
      const w = window as unknown as { mochiscout?: (event: string) => void }
      if (w.mochiscout) w.mochiscout('signup')
      else if (++tries < 20) setTimeout(report, 250)
    }
    report()
  }, { immediate: true })
})
