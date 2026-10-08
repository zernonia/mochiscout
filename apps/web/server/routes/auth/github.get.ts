export default defineOAuthGitHubEventHandler({
  config: { emailRequired: true },
  async onSuccess(event, { user: gh }) {
    try {
      const user = await signInWithOAuth(event, {
        provider: 'github',
        providerAccountId: String(gh.id),
        email: gh.email,
        emailVerified: Boolean(gh.email_verified),
        name: gh.name ?? gh.login,
        image: gh.avatar_url,
      })
      await startSession(event, user)
      return sendRedirect(event, '/app')
    }
    catch (error) {
      return sendRedirect(event, `/login?error=${encodeURIComponent(error instanceof AuthError ? error.message : 'GitHub sign-in failed')}`)
    }
  },
  onError(event, error) {
    console.error('[auth] github', error)
    return sendRedirect(event, '/login?error=GitHub%20sign-in%20failed')
  },
})
