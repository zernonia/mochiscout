import { recordRefEvent } from '@mochiscout/core'
import { z } from 'zod'

const Body = z.object({ p: z.string().max(64), c: z.string().max(16), e: z.enum(['visit', 'signup']) })

/**
 * Public beacon from the tracking script on a founder's site (/t.js). Sent as
 * text/plain via sendBeacon, so no preflight. Always answers 204: callers
 * learn nothing about which codes exist.
 */
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  setResponseStatus(event, 204)
  try {
    const raw = await readRawBody(event)
    const parsed = Body.safeParse(JSON.parse(raw ?? ''))
    if (parsed.success) {
      // Anyone can send a beacon, so cap how fast one network can count events.
      await rateLimit(event, `beacon:${clientKey(event)}`, { max: 30, windowSeconds: 60 })
      await recordRefEvent(getDb(event), {
        projectId: parsed.data.p,
        code: parsed.data.c,
        event: parsed.data.e,
        origin: getRequestHeader(event, 'origin') ?? getRequestHeader(event, 'referer'),
      })
    }
  }
  catch { /* malformed and over-limit beacons are ignored */ }
  return null
})
