import { z } from 'zod'

const Body = z.object({
  email: z.email().max(320),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  name: z.string().trim().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, Body.parse)
  try {
    await rateLimitAuth(event, body.email)
    await rateLimitSignup(event)
    const user = await signUpWithPassword(event, body)
    await startSession(event, user)
    return { ok: true }
  }
  catch (error) {
    if (error instanceof AuthError) throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    throw error
  }
})
