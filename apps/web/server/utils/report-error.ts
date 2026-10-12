/**
 * Server-side errors → PostHog error tracking (`$exception` events), so 500s
 * and failed cron jobs on the hosted edition can be found and queried later.
 * No-op without a PostHog key (self-hosted instances never send anything).
 */
const CAPTURE_URL = 'https://us.i.posthog.com/i/v0/e/'

interface Frame {
  platform: 'node:javascript'
  function: string
  filename: string
  lineno?: number
  colno?: number
  in_app: boolean
}

/** V8 stack lines: "    at fn (file:line:col)" or "    at file:line:col". */
function parseStack(stack: string | undefined): Frame[] {
  if (!stack) return []
  const frames: Frame[] = []
  for (const line of stack.split('\n').slice(1)) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/)
    if (!m) continue
    const filename = m[2]!
    frames.push({
      platform: 'node:javascript',
      function: m[1] ?? '<anonymous>',
      filename,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !/node_modules|cloudflare-internal|node:/.test(filename),
    })
  }
  // PostHog expects the innermost frame last.
  return frames.reverse()
}

export interface ErrorContext {
  /** Signed-in user id, when known: links the error to the person. */
  distinctId?: string
  /** Where it happened: 'request', 'cron', 'queue'. */
  source: string
  [key: string]: unknown
}

export function exceptionEvent(error: unknown, ctx: ErrorContext) {
  const err = error instanceof Error ? error : new Error(String(error))
  // h3 wraps the original error; report the cause, which has the useful stack.
  const root = (err as { cause?: unknown }).cause instanceof Error ? (err as { cause: Error }).cause : err
  const { distinctId, ...props } = ctx
  return {
    event: '$exception',
    distinct_id: distinctId ?? `server:${ctx.source}`,
    timestamp: new Date().toISOString(),
    properties: {
      $exception_list: [{
        type: root.name || 'Error',
        value: root.message.slice(0, 2000),
        mechanism: { handled: false, synthetic: !(error instanceof Error) },
        stacktrace: { type: 'raw', frames: parseStack(root.stack) },
      }],
      $exception_level: 'error',
      ...(distinctId ? {} : { $process_person_profile: false }),
      environment: import.meta.dev ? 'development' : 'production',
      runtime: 'cloudflare-worker',
      ...props,
    },
  }
}

const pending = new Set<Promise<void>>()

/** Wait for reports sent from cron or queue handlers before the Worker invocation ends. */
export async function flushErrorReports() {
  await Promise.allSettled([...pending])
}

export function reportServerError(apiKey: string | undefined, error: unknown, ctx: ErrorContext): Promise<void> {
  if (!apiKey) return Promise.resolve()
  const task = send(apiKey, error, ctx).finally(() => pending.delete(task))
  pending.add(task)
  return task
}

/** Send one report and return PostHog's HTTP status (0 when unreachable). */
export async function sendErrorReport(apiKey: string, error: unknown, ctx: ErrorContext): Promise<number> {
  try {
    const res = await fetch(CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, ...exceptionEvent(error, ctx) }),
    })
    if (!res.ok) console.error('[report-error] PostHog answered', res.status, await res.text().catch(() => ''))
    return res.status
  }
  catch (e) {
    console.error('[report-error] could not reach PostHog', String(e))
    return 0
  }
}

async function send(apiKey: string, error: unknown, ctx: ErrorContext) {
  await sendErrorReport(apiKey, error, ctx)
}
