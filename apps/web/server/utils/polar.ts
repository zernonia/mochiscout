import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { Env } from './env'

export function polarConfigured(env: Env) {
  return Boolean(env.POLAR_ACCESS_TOKEN && env.POLAR_PRODUCT_SOLO && env.POLAR_PRODUCT_PRO)
}

export function polarProducts(env: Env) {
  return { solo: env.POLAR_PRODUCT_SOLO, pro: env.POLAR_PRODUCT_PRO }
}

/** Minimal Polar API client (checkouts, customer sessions, subscription changes). */
export async function polar<T>(env: Env, path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
  if (!env.POLAR_ACCESS_TOKEN) throw createError({ statusCode: 503, statusMessage: 'Billing is not configured.' })
  const base = env.POLAR_SERVER === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh'
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[polar] ${method} ${path} ${res.status}`, text)
    // Polar's own message when it's a plain sentence (e.g. a declined card), else a generic one.
    let detail: unknown
    try {
      detail = (JSON.parse(text) as { detail?: unknown }).detail
    }
    catch {}
    const message = typeof detail === 'string' && detail.length < 200 ? `Billing: ${detail}` : 'The billing provider returned an error. Try again shortly.'
    throw createError({ statusCode: 502, statusMessage: message })
  }
  return res.json() as Promise<T>
}

/** Billing only exists on the hosted edition. */
export function requireCloud(event: RequestEvent) {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

export function appUrl(event: RequestEvent, env: Env) {
  return env.APP_URL ?? getRequestURL(event).origin
}
