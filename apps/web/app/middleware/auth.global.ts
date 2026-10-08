export default defineNuxtRouteMiddleware(async (to) => {
  const needsAuth = to.path === '/app' || to.path.startsWith('/app/')
  if (!needsAuth && to.path !== '/login') return

  const { data } = await useAuthSession()
  if (needsAuth && !data.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.path === '/login' && data.value) {
    return navigateTo('/app')
  }
})
