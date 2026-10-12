import posthog from 'posthog-js'

/** Browser-side product event. A no-op unless PostHog was initialised (hosted edition with a key). */
export function trackClient(name: string, properties: Record<string, unknown> = {}) {
  if ((posthog as unknown as { __loaded?: boolean }).__loaded) posthog.capture(name, properties)
}
