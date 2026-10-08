// Which sign-in methods this instance has configured, for the login page.
export default defineEventHandler((event) => {
  const env = getEnv(event)
  return {
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    magicLink: true,
  }
})
