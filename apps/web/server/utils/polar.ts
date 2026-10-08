import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import type { Env } from './env'

export function polarConfigured(env: Env) {
  return Boolean(env.POLAR_ACCESS_TOKEN && env.POLAR_PRODUCT_SOLO && env.POLAR_PRODUCT_PRO)
}

export function polarProducts(env: Env) {
  return { solo: env.POLAR_PRODUCT_SOLO, pro: env.POLAR_PRODUCT_PRO }
}

/** Minimal Polar API client (checkouts, customer sessions). */
export async function polar<T>(env: Env, path: string, body: unknown): Promise<T> {
  if (!env.POLAR_ACCESS_TOKEN) throw createError({ statusCode: 503, statusMessage: 'Billing is not configured.' })
  const base = env.POLAR_SERVER === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh'
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.POLAR_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`[polar] ${path} ${res.status}`, await res.text())
    throw createError({ statusCode: 502, statusMessage: 'The billing provider returned an error. Try again shortly.' })
  }
  return res.json() as Promise<T>
}

/** Billing only exists on the hosted edition. */
export function requireCloud(event: RequestEvent) {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

export function appUrl(event: RequestEvent, env: Env) {
  return env.APP_URL ?? env.BETTER_AUTH_URL ?? getRequestURL(event).origin
}
