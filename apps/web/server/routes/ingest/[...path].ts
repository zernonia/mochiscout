// PostHog reverse proxy: analytics go through our own domain, so fewer are dropped by ad blockers.
const API_HOST = 'https://us.i.posthog.com'
const ASSET_HOST = 'https://us-assets.i.posthog.com'
const FORWARD_HEADERS = ['content-type', 'content-encoding', 'user-agent', 'accept', 'accept-language', 'origin', 'referer']

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })

  const path = event.path.replace(/^\/ingest/, '')
  const target = (path.startsWith('/static/') ? ASSET_HOST : API_HOST) + path

  const headers = new Headers()
  for (const name of FORWARD_HEADERS) {
    const value = getRequestHeader(event, name)
    if (value) headers.set(name, value)
  }
  const ip = getRequestIP(event, { xForwardedFor: true })
  if (ip) headers.set('x-forwarded-for', ip)

  const raw = event.method === 'GET' || event.method === 'HEAD' ? undefined : await readRawBody(event, false)
  const res = await fetch(target, {
    method: event.method,
    headers,
    body: raw ? new Uint8Array(raw) : undefined,
    redirect: 'manual',
  })

  // fetch already decoded the body; drop headers that describe the encoded form.
  const out = new Headers(res.headers)
  for (const name of ['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie']) out.delete(name)
  return new Response(res.body, { status: res.status, headers: out })
})
