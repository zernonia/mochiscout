import { z } from 'zod'

const Query = z.object({
  q: z.string().trim().max(50),
  /** Also ask Reddit (slower on a cache miss); without it only known subreddits are searched. */
  remote: z.enum(['0', '1']).default('0'),
})

/** Subreddit suggestions for the "watch a subreddit" box. */
export default defineEventHandler(async (event) => {
  const { user: { id: userId } } = await requireUser(event)
  const { q, remote } = await getValidatedQuery(event, Query.parse)
  return findSubreddits(event, userId, q, { remote: remote === '1' })
})
