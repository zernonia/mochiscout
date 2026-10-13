import { describe, expect, it } from 'vitest'
import { parseSubredditSearch, searchSubreddits } from '../src/reddit/search'

const body = '```json\n' + JSON.stringify({ data: { children: [
  { data: { display_name: 'productivity', subscribers: 4257475, public_description: 'Tips &amp; tricks', subreddit_type: 'public', over18: false } },
  { data: { display_name: 'nsfwthing', subscribers: 10, over18: true } },
  { data: { display_name: 'secret', subscribers: 5, subreddit_type: 'private' } },
] } }) + '\n```'

describe('parseSubredditSearch', () => {
  it('keeps public, safe-for-work subs', () => {
    expect(parseSubredditSearch(body)).toEqual([{ name: 'productivity', subscribers: 4257475, description: 'Tips & tricks' }])
    expect(parseSubredditSearch('<html>')).toBeNull()
  })
})

describe('searchSubreddits', () => {
  it('fetches search.json and throws on fetch errors', async () => {
    const ok = { fetch: async (urls: string[]) => new Map([[urls[0]!, { text: body }]]) }
    expect(await searchSubreddits(ok, 'prod')).toHaveLength(1)
    const bad = { fetch: async (urls: string[]) => new Map([[urls[0]!, { error: 'target_http_error' }]]) }
    await expect(searchSubreddits(bad, 'prod')).rejects.toThrow('target_http_error')
  })
})
