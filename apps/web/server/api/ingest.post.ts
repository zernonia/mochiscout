import { queueRssThreads, upsertPosts } from '@mochiscout/core'
import { normalizeExtensionPost } from '@mochiscout/sources'
import { z } from 'zod'

const Body = z.object({
  posts: z.array(z.object({
    fullname: z.string().max(20),
    subreddit: z.string().max(30),
    title: z.string().max(400),
    permalink: z.string().max(400),
    author: z.string().max(40).nullish(),
    createdAt: z.union([z.string().max(40), z.number()]).nullish(),
    body: z.string().max(20_000).nullish(),
  })).max(100),
})

/**
 * Posts read by the browser extension from the user's own reddit.com session
 * (arch §5 fallback). New posts go through the same prefilter as RSS.
 */
export default defineEventHandler(async (event) => {
  const { org } = await authenticateApiKey(event)
  const { posts } = await readValidatedBody(event, Body.parse)
  const env = getEnv(event)

  // Keep one browser from flooding the database.
  const key = `ingest:${org.id}:${new Date().toISOString().slice(0, 13)}`
  const used = Number(await env.CACHE.get(key) ?? 0)
  if (used >= 2000) throw createError({ statusCode: 429, statusMessage: 'Hourly ingest limit reached' })
  await env.CACHE.put(key, String(used + posts.length), { expirationTtl: 7200 })

  const normalized = posts.map(normalizeExtensionPost).filter(p => p !== null)
  const ctx = createJobContext(env)
  const fresh = await upsertPosts(ctx, normalized, 'extension')
  const queued = await queueRssThreads(ctx, fresh)
  return { received: posts.length, accepted: normalized.length, new: fresh.length, queued }
})
