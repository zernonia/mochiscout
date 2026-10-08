import type { KVNamespace, Queue } from '@cloudflare/workers-types'
import type { Db } from '@social-radar/db'
import type { Llm } from '@social-radar/llm'
import type { Http, Platform, SearchClient, SourceAdapter } from '@social-radar/sources'
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
  /** Feed sources besides Reddit (HN, Bluesky, X). */
  adapters?: Partial<Record<Platform, SourceAdapter>>
  /** Undefined when no LLM key is configured; scoring then waits. */
  llm?: Llm
  /** Sends email (Resend). Undefined: digests are skipped. */
  sendEmail?: (email: { to: string, subject: string, html: string, text: string }) => Promise<void>
  /** Public app URL for links in emails. */
  appUrl?: string
  now: () => Date
  log: (message: string, data?: Record<string, unknown>) => void
}
