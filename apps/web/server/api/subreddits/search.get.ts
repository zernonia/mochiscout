import type { SubredditOption } from '@mochiscout/core'
import { rankSubreddits } from '@mochiscout/core'
import { like, schema } from '@mochiscout/db'
import { allRules } from '@mochiscout/rules'
import { searchSubreddits, tinyfishFetcher } from '@mochiscout/sources'
import { z } from 'zod'

const Query = z.object({
  q: z.string().trim().max(50),
  /** Also ask Reddit (slower on a cache miss); without it only known subreddits are searched. */
  remote: z.enum(['0', '1']).default('0'),
})

const REMOTE_MIN = 3
const REMOTE_TTL = 30 * 86_400
/** Reddit lookups per user per day that miss the cache (they cost page fetches). */
const REMOTE_PER_DAY = 300

/** Subreddit suggestions for the "watch a subreddit" box. */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const userId = session.user?.id
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const { q: raw, remote } = await getValidatedQuery(event, Query.parse)
  const q = raw.replace(/^(https?:\/\/(www\.|old\.)?reddit\.com)?\/?r\//i, '').replace(/[^\w]/g, '').toLowerCase()
  if (!q) return { query: q, results: [] }

  const library: SubredditOption[] = allRules().map(r => ({ name: r.name, subscribers: null, description: null, hasRules: true }))
  const known = await getDb(event)
    .select({ name: schema.subreddits.name, subscribers: schema.subreddits.subscribers, description: schema.subreddits.description, autoRulesAt: schema.subreddits.autoRulesAt })
    .from(schema.subreddits)
    .where(like(schema.subreddits.name, `%${q}%`))
    .limit(50)
  const options: SubredditOption[] = [...library, ...known.map(k => ({ name: k.name, subscribers: k.subscribers, description: k.description, hasRules: !!k.autoRulesAt }))]

  if (remote === '1' && q.length >= REMOTE_MIN) options.push(...await redditResults(event, userId, q))
  return { query: q, results: rankSubreddits(q, options) }
})

async function redditResults(event: Parameters<typeof getEnv>[0], userId: string, q: string): Promise<SubredditOption[]> {
  const env = getEnv(event)
  const cacheKey = `subsearch:v1:${q}`
  const cached = await env.CACHE.get(cacheKey, 'json') as SubredditOption[] | null
  if (cached) return cached
  if (!env.TINYFISH_API_KEY) return []

  const dayKey = `subsearch:user:${userId}:${new Date().toISOString().slice(0, 10)}`
  const used = Number(await env.CACHE.get(dayKey) ?? 0)
  if (used >= REMOTE_PER_DAY) return []
  await env.CACHE.put(dayKey, String(used + 1), { expirationTtl: 90_000 })

  try {
    const hits = await searchSubreddits(tinyfishFetcher(env.TINYFISH_API_KEY, { ttlSeconds: REMOTE_TTL }), q)
    await env.CACHE.put(cacheKey, JSON.stringify(hits), { expirationTtl: REMOTE_TTL })
    return hits
  }
  catch (error) {
    // Known subreddits still show; Reddit's results just don't.
    console.warn('subreddit search failed', q, String(error))
    return []
  }
}
