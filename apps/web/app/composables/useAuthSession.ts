import { authClient } from '~/lib/auth-client'

/** SSR-safe session: fetched with the request's cookies during server render. */
export function useAuthSession() {
  return authClient.useSession(useFetch)
}
