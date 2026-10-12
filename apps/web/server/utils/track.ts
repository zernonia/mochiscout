import type { H3Event } from 'h3'

/**
 * Product events from the server (activation funnel). Same PostHog project
 * and distinct id as the browser (the user id), so funnels join up. No-op
 * without a PostHog key: self-hosted instances never send anything.
 */
const CAPTURE_URL = 'https://us.i.posthog.com/i/v0/e/'

export function track(event: H3Event, userId: string, name: string, properties: Record<string, unknown> = {}) {
  const key = useRuntimeConfig(event).public.posthogKey
  if (!key) return
  const task = fetch(CAPTURE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, event: name, distinct_id: userId, timestamp: new Date().toISOString(), properties: { ...properties, $lib: 'mochiscout-server' } }),
  }).catch(error => console.error('[track] could not reach PostHog', String(error)))
  if (typeof event.waitUntil === 'function') event.waitUntil(task)
}
