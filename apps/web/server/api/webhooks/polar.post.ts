import type { PolarSubscription } from '@mochiscout/core'
import { isAppTrial, planForSubscription, verifyWebhook, WebhookVerificationError } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.active',
  'subscription.canceled',
  'subscription.uncanceled',
  'subscription.revoked',
])

/** Polar webhook: keeps orgs.plan in sync with the subscription. Signature verified. */
export default defineEventHandler(async (event) => {
  const env = getEnv(event)
  if (!env.POLAR_WEBHOOK_SECRET) throw createError({ statusCode: 503, statusMessage: 'Webhook secret not configured' })

  const body = (await readRawBody(event, 'utf8')) ?? ''
  const id = getRequestHeader(event, 'webhook-id') ?? null
  try {
    await verifyWebhook(env.POLAR_WEBHOOK_SECRET, {
      id,
      timestamp: getRequestHeader(event, 'webhook-timestamp') ?? null,
      signature: getRequestHeader(event, 'webhook-signature') ?? null,
    }, body)
  }
  catch (error) {
    if (error instanceof WebhookVerificationError) throw createError({ statusCode: 403, statusMessage: error.message })
    throw error
  }

  // Polar retries deliveries; process each webhook id once.
  const seenKey = `polar:webhook:${id}`
  if (await env.CACHE.get(seenKey)) return { ok: true, duplicate: true }

  const payload = JSON.parse(body) as { type: string, data: PolarSubscription }
  if (SUBSCRIPTION_EVENTS.has(payload.type)) {
    const sub = payload.data
    const orgId = sub.customer?.external_id ?? (typeof sub.metadata?.org_id === 'string' ? sub.metadata.org_id : null)
    if (!orgId) {
      console.warn('[polar] subscription without org id', sub.id)
    }
    else {
      const db = getDb(event)
      const org = await db.select().from(schema.orgs).where(eq(schema.orgs.id, orgId)).get()
      // Ignore stale events for a subscription the org has since replaced.
      if (org && (!org.polarSubscriptionId || org.polarSubscriptionId === sub.id || ['active', 'trialing'].includes(sub.status))) {
        const plan = planForSubscription(sub, polarProducts(env))
        await db.update(schema.orgs).set({
          plan,
          planStatus: sub.status,
          polarSubscriptionId: sub.id,
          polarCustomerId: sub.customer?.id ?? org.polarCustomerId,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
        }).where(eq(schema.orgs.id, orgId))
        console.info(`[polar] ${payload.type} org=${orgId} plan=${plan} status=${sub.status}`)
        // Conversion events, attributed to the org owner (the person who checked out).
        if (plan !== org.plan) track(event, org.ownerId, 'plan_changed', { from_plan: org.plan, to_plan: plan, status: sub.status })
        if (isAppTrial(org) && plan !== 'free') track(event, org.ownerId, 'trial_converted', { to_plan: plan })
      }
    }
  }
  await env.CACHE.put(seenKey, '1', { expirationTtl: 7 * 86_400 })
  return { ok: true }
})
