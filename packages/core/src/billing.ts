import type { Plan } from './plans'

/**
 * Standard Webhooks verification (used by Polar), with WebCrypto so it runs
 * in Workers. Signed content: `${webhook-id}.${webhook-timestamp}.${body}`,
 * HMAC-SHA256, base64, sent as one or more space-separated `v1,<sig>`.
 *
 * Polar secrets created before 8 Sep 2026 use the UTF-8 bytes of the whole
 * `whsec_…` string as the key; newer ones are base64 after the prefix. Both
 * are tried, as Polar's SDKs do.
 */
export class WebhookVerificationError extends Error {}

const TOLERANCE_S = 5 * 60

function b64ToBytes(b64: string) {
  const bin = atob(b64)
  return Uint8Array.from(bin, c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

function bytesToB64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

async function hmac(key: Uint8Array<ArrayBuffer>, content: string) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return bytesToB64(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(content)))
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function webhookKeys(secret: string): Uint8Array<ArrayBuffer>[] {
  const keys = [new TextEncoder().encode(secret) as Uint8Array<ArrayBuffer>]
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret
  try {
    keys.unshift(b64ToBytes(raw))
  }
  catch {}
  return keys
}

export async function verifyWebhook(
  secret: string,
  headers: { id: string | null, timestamp: string | null, signature: string | null },
  body: string,
  now = Date.now(),
) {
  if (!headers.id || !headers.timestamp || !headers.signature) throw new WebhookVerificationError('Missing webhook headers')
  const ts = Number(headers.timestamp)
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_S) throw new WebhookVerificationError('Timestamp outside tolerance')

  const content = `${headers.id}.${headers.timestamp}.${body}`
  const sent = headers.signature.split(' ').map(s => s.split(',')).filter(([v]) => v === 'v1').map(([, sig]) => sig ?? '')
  for (const key of webhookKeys(secret)) {
    const expected = await hmac(key, content)
    if (sent.some(sig => timingSafeEqual(sig, expected))) return
  }
  throw new WebhookVerificationError('Bad signature')
}

/** Sign like a Standard Webhooks sender (for tests and local tooling). */
export async function signWebhook(secret: string, id: string, timestamp: number, body: string) {
  return `v1,${await hmac(webhookKeys(secret)[0]!, `${id}.${timestamp}.${body}`)}`
}

export interface PolarSubscription {
  id: string
  status: string
  product_id: string
  current_period_end?: string | null
  customer?: { id?: string, external_id?: string | null } | null
  metadata?: Record<string, unknown> | null
}

/** Plan an org should be on, given a subscription event. */
export function planForSubscription(
  sub: PolarSubscription,
  products: { solo?: string, pro?: string },
): Plan {
  const plan: Plan | null = sub.product_id === products.pro ? 'pro' : sub.product_id === products.solo ? 'solo' : null
  if (!plan) return 'free'
  // past_due keeps access while Polar retries the payment; anything else ends it.
  return ['active', 'trialing', 'past_due'].includes(sub.status) ? plan : 'free'
}
