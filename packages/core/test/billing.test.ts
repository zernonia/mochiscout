import { describe, expect, it } from 'vitest'
import { planForSubscription, signWebhook, verifyWebhook, WebhookVerificationError } from '../src/billing'

// A Standard Webhooks style secret: whsec_ + base64 key bytes.
const secret = `whsec_${btoa('a-32-byte-secret-key-for-tests!!')}`
const now = 1_790_000_000_000
const ts = now / 1000
const body = JSON.stringify({ type: 'subscription.active', data: { id: 's1' } })

describe('verifyWebhook', () => {
  it('accepts a valid signature', async () => {
    const signature = await signWebhook(secret, 'msg_1', ts, body)
    await expect(verifyWebhook(secret, { id: 'msg_1', timestamp: String(ts), signature }, body, now)).resolves.toBeUndefined()
  })
  it('accepts any matching signature in a list', async () => {
    const good = await signWebhook(secret, 'msg_1', ts, body)
    await expect(verifyWebhook(secret, { id: 'msg_1', timestamp: String(ts), signature: `v1,bogus ${good}` }, body, now)).resolves.toBeUndefined()
  })
  it('accepts legacy Polar secrets keyed by the raw string', async () => {
    const legacy = 'whsec_not-base64!!'
    const signature = await signWebhook(legacy, 'msg_2', ts, body)
    await expect(verifyWebhook(legacy, { id: 'msg_2', timestamp: String(ts), signature }, body, now)).resolves.toBeUndefined()
  })
  it('rejects tampered bodies, wrong ids, stale timestamps and missing headers', async () => {
    const signature = await signWebhook(secret, 'msg_1', ts, body)
    const h = { id: 'msg_1', timestamp: String(ts), signature }
    await expect(verifyWebhook(secret, h, `${body} `, now)).rejects.toBeInstanceOf(WebhookVerificationError)
    await expect(verifyWebhook(secret, { ...h, id: 'msg_x' }, body, now)).rejects.toBeInstanceOf(WebhookVerificationError)
    await expect(verifyWebhook(secret, h, body, now + 10 * 60_000)).rejects.toThrow('tolerance')
    await expect(verifyWebhook(secret, { ...h, signature: null }, body, now)).rejects.toThrow('Missing')
  })
})

describe('planForSubscription', () => {
  const products = { solo: 'prod_solo', pro: 'prod_pro' }
  it('maps active products to plans', () => {
    expect(planForSubscription({ id: 's', status: 'active', product_id: 'prod_pro' }, products)).toBe('pro')
    expect(planForSubscription({ id: 's', status: 'trialing', product_id: 'prod_solo' }, products)).toBe('solo')
    expect(planForSubscription({ id: 's', status: 'past_due', product_id: 'prod_solo' }, products)).toBe('solo')
  })
  it('falls back to free when the subscription ends or the product is unknown', () => {
    expect(planForSubscription({ id: 's', status: 'canceled', product_id: 'prod_pro' }, products)).toBe('free')
    expect(planForSubscription({ id: 's', status: 'revoked', product_id: 'prod_pro' }, products)).toBe('free')
    expect(planForSubscription({ id: 's', status: 'active', product_id: 'other' }, products)).toBe('free')
  })
})
