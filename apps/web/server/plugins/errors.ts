// Send unexpected server errors (5xx, uncaught) to PostHog error tracking.
// 4xx are expected (validation, auth, quota) and stay out.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500
    if (status < 500) return
    const key = useRuntimeConfig(event).public.posthogKey
    if (!key) return
    const session = event?.context.mochiscoutUserId as string | undefined
    const task = reportServerError(key, error, {
      source: event ? 'request' : 'process',
      distinctId: session,
      ...(event ? { method: event.method, path: event.path?.split('?')[0], $current_url: getRequestURL(event).href, status_code: status } : {}),
    })
    // Keep the Worker alive until the report is sent (called as a method: it needs its context).
    const cf = (event?.context.cloudflare as { context?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined)?.context
    cf?.waitUntil?.(task)
  })
})
