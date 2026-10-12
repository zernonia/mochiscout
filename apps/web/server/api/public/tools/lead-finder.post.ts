import { findLeads } from '@mochiscout/core'
import { z } from 'zod'

const Body = z.object({ what: z.string().trim().min(3).max(120) })
const CACHE_TTL_S = 6 * 3600

/** The free lead finder: recent threads asking for what you sell (cached per query for 6 hours). */
export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Describe what you sell in a few words, like "changelog tool for SaaS".' })
  const what = parsed.data.what.replace(/\s+/g, ' ')
  const env = getEnv(event)
  const key = `tool:leads:${what.toLowerCase()}`
  const cached = await env.CACHE.get<{ leads: unknown[] }>(key, 'json')
  if (cached) return { what, ...cached, cached: true }

  await limitFreeTool(event, 'leads', { perHour: 5, perDay: 200 })
  const ctx = createJobContext(env, { budgetMs: 20_000 })
  if (!ctx.search) throw createError({ statusCode: 503, statusMessage: 'The lead finder is unavailable right now.' })
  const leads = await findLeads({ search: ctx.search, hn: ctx.adapters?.hn }, what, new Date())
  await env.CACHE.put(key, JSON.stringify({ leads }), { expirationTtl: CACHE_TTL_S })
  return { what, leads, cached: false }
})
