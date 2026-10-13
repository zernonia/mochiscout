// Send unexpected server errors to PostHog error tracking: every 5xx, and any
// error our code didn't throw on purpose (h3 marks those `unhandled`), whatever
// its status: an upstream API error carrying `status: 403` is still a bug to see.
// Deliberate 4xx (validation, auth, quota) stay out.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500
    if (status < 500 && !(error as { unhandled?: boolean }).unhandled) return
    const key = useRuntimeConfig(event).public.posthogKey
    if (!key) return
    const session = event?.context.mochiscoutUserId as string | undefined
    const task = reportServerError(key, error, {
      source: event ? 'request' : 'process',
      distinctId: session,
      ...(event ? { method: event.method, path: event.path?.split('?')[0], $current_url: getRequestURL(event).href, status_code: status } : {}),
    })
    // Keep the Worker alive until the report is sent. h3's event.waitUntil is wired to the
    // Worker's ExecutionContext; the raw context is the fallback (called as a method: it needs its this).
    if (event && typeof event.waitUntil === 'function') event.waitUntil(task)
    else (event?.context.cloudflare as { context?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined)?.context?.waitUntil?.(task)
  })
})
