import type { KVNamespace, Queue } from '@cloudflare/workers-types'
import type { Db } from '@mochiscout/db'
import type { Llm } from '@mochiscout/llm'
import type { Http, PageFetcher, Platform, SearchClient, SourceAdapter } from '@mochiscout/sources'
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
  /** Page fetch service (TinyFish Fetch) for pages Reddit won't serve to the Worker, like official rules. */
  pages?: PageFetcher
  /**
   * How Reddit is read (arch §5): server (RSS from the Worker), extension
   * (only what users' browser extensions send) or search_only.
   */
  readMode?: 'server' | 'extension' | 'search_only'
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
