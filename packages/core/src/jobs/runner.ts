import type { JobName } from '../schedule'
import type { JobContext } from './context'
import type { Job } from './types'
import { HttpDeferredError } from '@mochiscout/sources'
import { dueJobs } from '../schedule'
import { runAutoReplies } from '../drafter/reply'
import { runHotAlerts } from '../leads/alerts'
import { runReplyWatch } from '../leads/reply-watch'
import { runLeadChecks } from '../leads/context'
import { runWeeklyResearch } from '../research/research'
import { runScoring } from '../scoring/score'
import { runSubredditInsights } from '../subreddits/insights'
import { runDigest } from '../today/digest'
import { runTracker } from '../tracker/tracker'
import { runDiscovery } from './discovery'
import { runFeedDiscovery } from './feeds'
import { planFetch, runFetchGroup } from './fetch'
import { runRetention } from './retention'
import { runTrials } from '../trial'

export interface TickResult {
  ran: JobName[]
  skipped: JobName[]
  details: Record<string, unknown>
}

/** Run one queued or inline job. */
export async function runJob(ctx: JobContext, job: Job) {
  switch (job.type) {
    case 'fetch-group':
      return runFetchGroup(ctx, job)
  }
}

async function planFetchTick(ctx: JobContext) {
  if (ctx.readMode && ctx.readMode !== 'server') return { skipped: `READ_MODE=${ctx.readMode}` }
  const groups = await planFetch(ctx)
  if (ctx.queue) {
    if (groups.length) await ctx.queue.sendBatch(groups.map(body => ({ body })))
    return { groups: groups.length, queued: true }
  }

  // Inline: one group after another through the shared HTTP client. If Reddit
  // rate-limits us past the run's deadline, stop; the rest stay due next tick.
  let done = 0
  let newThreads = 0
  let queued = 0
  for (const group of groups) {
    try {
      const result = await runFetchGroup(ctx, group)
      newThreads += result.newThreadIds.length
      queued += result.queued
      done++
    }
    catch (error) {
      if (error instanceof HttpDeferredError) {
        ctx.log('plan-fetch deferred', { retryAt: new Date(error.retryAt).toISOString(), remaining: groups.length - done })
        break
      }
      ctx.log('fetch-group failed', { subreddits: group.subreddits, error: String(error) })
    }
  }
  return { groups: groups.length, done, newThreads, queued }
}

const handlers: Partial<Record<JobName, (ctx: JobContext) => Promise<unknown>>> = {
  'plan-fetch': planFetchTick,
  'search-discovery': ctx => runDiscovery(ctx),
  'feeds': runFeedDiscovery,
  'score': runScoring,
  'lead-checks': runLeadChecks,
  'auto-replies': runAutoReplies,
  'hot-alerts': runHotAlerts,
  'research': ctx => runWeeklyResearch(ctx),
  'tracker': runTracker,
  'digest': runDigest,
  'retention': runRetention,
  'insights': runSubredditInsights,
  'trials': runTrials,
  'reply-watch': runReplyWatch,
}

/** Cron dispatcher: run every job due at this tick. */
export async function runTick(ctx: JobContext, at = ctx.now()): Promise<TickResult> {
  const result: TickResult = { ran: [], skipped: [], details: {} }
  for (const name of dueJobs(at)) {
    const handler = handlers[name]
    if (!handler) {
      result.skipped.push(name)
      continue
    }
    try {
      result.details[name] = await handler(ctx)
      result.ran.push(name)
    }
    catch (error) {
      ctx.log(`${name} failed`, { error: String(error) })
      result.details[name] = { error: String(error) }
    }
  }
  return result
}
