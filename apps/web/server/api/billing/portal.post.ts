/** Polar customer portal for invoices, payment method, plan changes and cancellation. */
export default defineEventHandler(async (event) => {
  requireCloud(event)
  const { org } = await requireOwner(event)
  if (!org.polarCustomerId) throw createError({ statusCode: 404, statusMessage: 'No subscription yet.' })
  const env = getEnv(event)
  const session = await polar<{ customer_portal_url: string }>(env, '/v1/customer-sessions/', {
    customer_id: org.polarCustomerId,
    return_url: `${appUrl(event, env)}/app/billing`,
  })
  return { url: session.customer_portal_url }
})
