import { sql } from '@mochiscout/db'

/** At most one test error per this window, so the endpoint can't be used to spam error tracking. */
const TEST_ERROR_GAP_S = 600

export default defineEventHandler(async (event) => {
  const env = getEnv(event)
  const config = useRuntimeConfig(event)

  // ?test-error=1 raises a 500 so the error-reporting pipeline can be checked end to end.
  if (getQuery(event)['test-error'] === '1' && !(await env.CACHE.get('health:test-error'))) {
    await env.CACHE.put('health:test-error', '1', { expirationTtl: TEST_ERROR_GAP_S })
    throw new Error('Health check test error (safe to ignore)')
  }

  const [db] = await Promise.all([
    getDb(event).get<{ ok: number }>(sql`select 1 as ok`),
    env.CACHE.put('health:last', new Date().toISOString()),
  ])
  return {
    ok: true,
    db: db?.ok === 1,
    cache: (await env.CACHE.get('health:last')) !== null,
    edition: config.public.edition,
    // Sign-in needs a 32+ character NUXT_SESSION_PASSWORD at runtime (value never returned).
    session: sessionSecretStatus(config.session.password),
    // Server errors go to PostHog when a key is set (cloud only).
    errorReporting: config.public.posthogKey ? 'ok' : 'missing',
    llm: getLlm(env)?.models ?? null,
  }
})

function sessionSecretStatus(password: string | undefined) {
  if (!password) return 'missing'
  return password.length >= 32 ? 'ok' : 'too short'
}
