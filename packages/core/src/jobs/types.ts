export interface FetchGroupJob {
  type: 'fetch-group'
  /** Lowercase subreddit names fetched together as one combined feed. */
  subreddits: string[]
}

export type Job = FetchGroupJob
