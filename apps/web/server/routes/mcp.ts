import { assertMcp } from '@mochiscout/core'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

/**
 * MCP over Streamable HTTP (stateless: a fresh server per request, JSON
 * responses). Auth: `Authorization: Bearer sr_…` API key. Pro plan or
 * self-host.
 */
export default defineEventHandler(async (event) => {
  const { user, org } = await authenticateApiKey(event)
  await quota(() => assertMcp(org))

  const server = createMcpServer({ event, db: getDb(event), env: getEnv(event), userId: user.id, orgId: org.id })
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  try {
    return await transport.handleRequest(toWebRequest(event))
  }
  finally {
    event.waitUntil(server.close())
  }
})
