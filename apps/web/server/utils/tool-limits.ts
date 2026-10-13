import type { H3Event } from 'h3'

/**
 * Free public tools spend real money (search, page fetches, LLM calls), so
 * each is limited per IP per hour and in total per day.
 */
export async function limitFreeTool(event: H3Event, tool: string, opts: { perHour: number, perDay: number }) {
  const env = getEnv(event)
  const ip = clientKey(event)
  const hour = Math.floor(Date.now() / 3_600_000)
  const day = new Date().toISOString().slice(0, 10)
  const ipKey = `tool:${tool}:${ip}:${hour}`
  const dayKey = `tool:${tool}:all:${day}`
  const [byIp, all] = await Promise.all([env.CACHE.get(ipKey), env.CACHE.get(dayKey)])
  if (Number(byIp ?? 0) >= opts.perHour) {
    throw createError({ statusCode: 429, statusMessage: 'You\'ve used this tool a lot in the last hour. Try again later, or start free to get results every 15 minutes.' })
  }
  if (Number(all ?? 0) >= opts.perDay) {
    throw createError({ statusCode: 429, statusMessage: 'This free tool is busy today. Try again tomorrow, or start free.' })
  }
  await Promise.all([
    env.CACHE.put(ipKey, String(Number(byIp ?? 0) + 1), { expirationTtl: 3700 }),
    env.CACHE.put(dayKey, String(Number(all ?? 0) + 1), { expirationTtl: 90_000 }),
  ])
}
