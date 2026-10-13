// Login CSRF: stop another site from signing a visitor into the attacker's account.
// - OAuth callbacks must carry `state`. nuxt-auth-utils compares it to a cookie, and
//   with neither present the two match, so a bare `?code=` link would be accepted.
// - Password sign-in and sign-up take JSON only, from this origin: a cross-site HTML
//   form can't send JSON, and a browser always sends Origin on a cross-site POST.
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]!
  if (path.startsWith('/auth/') && event.method === 'GET') {
    const query = getQuery(event)
    if (query.code && !query.state) return sendRedirect(event, '/login?error=Sign-in%20link%20expired.%20Try%20again.')
    return
  }
  if (path.startsWith('/api/auth/') && event.method === 'POST') {
    const origin = getRequestHeader(event, 'origin')
    if (origin && origin !== getRequestURL(event).origin) throw createError({ statusCode: 403, statusMessage: 'Cross-site request refused' })
    if (!getRequestHeader(event, 'content-type')?.includes('application/json')) throw createError({ statusCode: 415, statusMessage: 'Send JSON' })
  }
})
