export default defineEventHandler(async (event) => {
  const { user, org } = await requireUser(event)
  return { user, org: { id: org.id, plan: org.plan } }
})
