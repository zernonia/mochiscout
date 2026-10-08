// Which sign-in methods this instance has configured, for the login page.
export default defineEventHandler((event) => {
  const { oauth } = useRuntimeConfig(event)
  return {
    github: Boolean(oauth.github.clientId && oauth.github.clientSecret),
    google: Boolean(oauth.google.clientId && oauth.google.clientSecret),
    password: true,
  }
})
