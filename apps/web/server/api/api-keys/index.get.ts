import { limitsFor } from '@mochiscout/core'

export default defineEventHandler(async (event) => {
  const { user, org } = await requireUser(event)
  return { mcpAllowed: limitsFor(org.plan).mcp, keys: await listApiKeys(event, org.id, user.id) }
})
