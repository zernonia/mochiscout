import type { PolarSubscription } from '@mochiscout/core'
import { PLANS, planForSubscription } from '@mochiscout/core'
import { eq, schema } from '@mochiscout/db'
import { z } from 'zod'

const Body = z.object({ plan: z.enum(['solo', 'pro']) })

/** Statuses where the org already pays and Polar refuses a second checkout. */
const LIVE = new Set(['active', 'trialing', 'past_due'])

/**
 * Start a Polar checkout for the active org (owner only). An org that already
 * has a subscription switches its product instead: upgrades charge the
 * prorated difference now, downgrades credit it to the next invoice.
 */
export default defineEventHandler(async (event) => {
  requireCloud(event)
  const { org, user } = await requireOwner(event)
  const { plan } = await readValidatedBody(event, Body.parse)
  const env = getEnv(event)
  const product = polarProducts(env)[plan]
  if (!product) throw createError({ statusCode: 503, statusMessage: 'Billing is not configured.' })
  if (org.plan === plan && LIVE.has(org.planStatus ?? '')) {
    throw createError({ statusCode: 409, statusMessage: `You are already on ${PLANS[plan].label}. Use Manage billing to change it.` })
  }

  if (org.polarSubscriptionId && LIVE.has(org.planStatus ?? '') && (org.plan === 'solo' || org.plan === 'pro')) {
    const upgrade = (PLANS[plan].price ?? 0) > (PLANS[org.plan].price ?? 0)
    const sub = await polar<PolarSubscription>(env, `/v1/subscriptions/${org.polarSubscriptionId}`, {
      product_id: product,
      proration_behavior: upgrade ? 'invoice' : 'prorate',
    }, 'PATCH')
    const next = planForSubscription(sub, polarProducts(env))
    await getDb(event).update(schema.orgs).set({
      plan: next,
      planStatus: sub.status,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : org.currentPeriodEnd,
    }).where(eq(schema.orgs.id, org.id))
    if (next !== org.plan) track(event, user.id, 'plan_changed', { from_plan: org.plan, to_plan: next, status: sub.status, via: 'switch' })
    return { switched: true as const, plan: next }
  }

  const base = appUrl(event, env)
  const checkout = await polar<{ url: string }>(env, '/v1/checkouts/', {
    products: [product],
    customer_email: user.email,
    external_customer_id: org.id,
    success_url: `${base}/app/billing?checkout=success`,
    metadata: { org_id: org.id, plan },
  })
  track(event, user.id, 'checkout_started', { plan, from_plan: org.plan })
  return { url: checkout.url }
})
