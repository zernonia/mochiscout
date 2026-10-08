export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const needsAuth = to.path === '/app' || to.path.startsWith('/app/')
  if (needsAuth && !loggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.path === '/login' && loggedIn.value) {
    return navigateTo('/app')
  }
})
