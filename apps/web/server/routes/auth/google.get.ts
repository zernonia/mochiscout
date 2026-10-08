export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: g }) {
    try {
      const user = await signInWithOAuth(event, {
        provider: 'google',
        providerAccountId: String(g.sub),
        email: g.email,
        emailVerified: g.email_verified === true || g.email_verified === 'true',
        name: g.name,
        image: g.picture,
      })
      await startSession(event, user)
      return sendRedirect(event, '/app')
    }
    catch (error) {
      return sendRedirect(event, `/login?error=${encodeURIComponent(error instanceof AuthError ? error.message : 'Google sign-in failed')}`)
    }
  },
  onError(event, error) {
    console.error('[auth] google', error)
    return sendRedirect(event, '/login?error=Google%20sign-in%20failed')
  },
})
