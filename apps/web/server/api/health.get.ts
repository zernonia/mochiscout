import { sql } from '@mochiscout/db'

/** At most one test error per this window, so the endpoint can't be used to spam error tracking. */
const TEST_ERROR_GAP_S = 600

export default defineEventHandler(async (event) => {
  const env = getEnv(event)
  const config = useRuntimeConfig(event)

  // ?test-error=1 raises a 500 so the error-reporting pipeline can be checked end to end;
  // ?test-report=1 sends a report directly and returns PostHog's status (no error hook involved).
  const query = getQuery(event)
  if ((query['test-error'] === '1' || query['test-report'] === '1') && !(await env.CACHE.get('health:test-error'))) {
    await env.CACHE.put('health:test-error', '1', { expirationTtl: TEST_ERROR_GAP_S })
    if (query['test-report'] === '1') {
      const status = config.public.posthogKey
        ? await sendErrorReport(config.public.posthogKey, new Error('Health check direct report (safe to ignore)'), { source: 'health' })
        : null
      return { reported: status }
    }
    throw new Error('Health check test error (safe to ignore)')
  }

  // Read-only: the endpoint is public, and a KV write per request could be run up by anyone.
  const [db, cache] = await Promise.all([
    getDb(event).get<{ ok: number }>(sql`select 1 as ok`),
    env.CACHE.get('health:probe').then(() => true, () => false),
  ])
  return {
    ok: true,
    db: db?.ok === 1,
    cache,
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
