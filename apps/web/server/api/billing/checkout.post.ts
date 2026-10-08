import { z } from 'zod'

const Body = z.object({ plan: z.enum(['solo', 'pro']) })

/** Start a Polar checkout for the active org (owner only). */
export default defineEventHandler(async (event) => {
  requireCloud(event)
  const { org, user } = await requireOwner(event)
  const { plan } = await readValidatedBody(event, Body.parse)
  const env = getEnv(event)
  const product = polarProducts(env)[plan]
  if (!product) throw createError({ statusCode: 503, statusMessage: 'Billing is not configured.' })
  if (org.plan === plan && org.planStatus === 'active') {
    throw createError({ statusCode: 409, statusMessage: `You are already on ${plan}. Use Manage billing to change it.` })
  }

  const base = appUrl(event, env)
  const checkout = await polar<{ url: string }>(env, '/v1/checkouts/', {
    products: [product],
    customer_email: user.email,
    external_customer_id: org.id,
    success_url: `${base}/app/billing?checkout=success`,
    metadata: { org_id: org.id, plan },
  })
  return { url: checkout.url }
})
