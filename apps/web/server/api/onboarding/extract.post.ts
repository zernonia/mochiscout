import { extractProductProfile, fetchProductPage, recordUsage, UnsafeUrlError } from '@mochiscout/core'
import { LlmRefusalError } from '@mochiscout/llm'
import { createHttp, HttpError } from '@mochiscout/sources'
import { z } from 'zod'

const Body = z.object({ url: z.string().trim().min(1).max(2048) })

/** Onboarding step 1: read the product's landing page and draft an editable profile. */
export default defineEventHandler(async (event) => {
  const { org } = await requireUser(event)
  const { url } = await readValidatedBody(event, Body.parse)
  const env = getEnv(event)

  const llm = getLlm(env)
  if (!llm) {
    throw createError({ statusCode: 503, statusMessage: 'No LLM key configured. Fill in the profile by hand, or set ANTHROPIC_API_KEY.' })
  }

  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
  let page
  try {
    page = await fetchProductPage(createHttp({ userAgent: sourcesUserAgent(env), minDelayMs: 0 }), normalized)
  }
  catch (error) {
    if (error instanceof UnsafeUrlError) throw createError({ statusCode: 400, statusMessage: error.message })
    if (error instanceof HttpError) throw createError({ statusCode: 422, statusMessage: `Could not read that page (HTTP ${error.status}).` })
    throw createError({ statusCode: 422, statusMessage: 'Could not read that page.' })
  }

  try {
    const { data, usage } = await extractProductProfile(llm, page)
    await recordUsage(getDb(event), org.id, { llmInputTokens: usage.inputTokens, llmOutputTokens: usage.outputTokens })
    return { url: page.url, profile: data }
  }
  catch (error) {
    if (error instanceof LlmRefusalError) throw createError({ statusCode: 422, statusMessage: 'The model declined to analyse this page.' })
    throw error
  }
})
