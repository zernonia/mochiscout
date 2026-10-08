import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const env = getEnv(event)
  const [db] = await Promise.all([
    getDb(event).get<{ ok: number }>(sql`select 1 as ok`),
    env.CACHE.put('health:last', new Date().toISOString()),
  ])
  return {
    ok: true,
    db: db?.ok === 1,
    cache: (await env.CACHE.get('health:last')) !== null,
    edition: useRuntimeConfig(event).public.edition,
  }
})
