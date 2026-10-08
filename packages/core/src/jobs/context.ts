import type { KVNamespace, Queue } from '@cloudflare/workers-types'
import type { Db } from '@social-radar/db'
import type { Http, SearchClient } from '@social-radar/sources'
import type { Job } from './types'

export interface JobContext {
  db: Db
  cache: KVNamespace
  /** Optional JOBS queue. When absent, jobs run inline. */
  queue?: Queue<Job>
  /** Shared polite HTTP client; the only path to reddit.com. */
  http: Http
  /** Search providers (TinyFish, Brave). Undefined when no key is configured. */
  search?: SearchClient
  now: () => Date
  log: (message: string, data?: Record<string, unknown>) => void
}
