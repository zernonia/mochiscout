import { assertMcp } from '@social-radar/core'
import { schema } from '@social-radar/db'
import { z } from 'zod'

const Body = z.object({ label: z.string().trim().min(1).max(60) })

/** Create an API key for the MCP server. The key is returned once. */
export default defineEventHandler(async (event) => {
  const { user, org } = await requireUser(event)
  await quota(() => assertMcp(org))
  const { label } = await readValidatedBody(event, Body.parse)
  const key = generateApiKey()
  await getDb(event).insert(schema.apiKeys).values({
    id: crypto.randomUUID(),
    orgId: org.id,
    userId: user.id,
    hash: await hashApiKey(key),
    prefix: key.slice(0, 10),
    label,
  })
  setResponseStatus(event, 201)
  return { key }
})
