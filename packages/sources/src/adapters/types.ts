import type { Platform, Post } from '../types'

/**
 * A feed source (arch §5.1). Each adapter turns a search term into normalized
 * posts; Reddit's subreddit polling stays in the RSS fetch job.
 */
export interface SourceAdapter {
  id: Platform
  label: string
  /** Posts matching `query` created after `since`, newest first. */
  search: (query: string, since: Date, limit?: number) => Promise<Post[]>
}
