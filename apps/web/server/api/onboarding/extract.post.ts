import { extractProductProfile, fetchProductPage, fetchProductPageVia, recordUsage, UnsafeUrlError } from '@mochiscout/core'
import { LlmRefusalError } from '@mochiscout/llm'
import { createHttp, tinyfishFetcher } from '@mochiscout/sources'
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
    page = await fetchProductPage(createHttp({ userAgent: sourcesUserAgent(env), minDelayMs: 0, fetch: selfAwareFetch(event, env) }), normalized)
  }
  catch (error) {
    if (error instanceof UnsafeUrlError || (error as Error).name === 'UnsafeUrlError') {
      throw createError({ statusCode: 400, statusMessage: (error as Error).message })
    }
    // Many sites' bot protection refuses requests from Cloudflare Workers (403, 429, 503…):
    // read the page through the page-fetch service, which loads it like a browser.
    const status = (error as { status?: number }).status
    const pages = env.TINYFISH_API_KEY ? tinyfishFetcher(env.TINYFISH_API_KEY) : null
    page = pages ? await fetchProductPageVia(pages, normalized).catch(() => null) : null
    if (!page) {
      throw createError({
        statusCode: 422,
        statusMessage: status === 404
          ? 'That page doesn\'t exist (404). Check the URL.'
          : `We couldn't read that page${status ? ` (it answered ${status})` : ''}. Describe your product instead.`,
      })
    }
  }

  try {
    const { data, usage } = await extractProductProfile(llm, page)
    await recordUsage(getDb(event), org.id, { llmInputTokens: usage.inputTokens, llmOutputTokens: usage.outputTokens })
    return { url: page.url, profile: data }
  }
  catch (error) {
    if (error instanceof LlmRefusalError) throw createError({ statusCode: 422, statusMessage: 'The model declined to analyse this page.' })
    // Upstream AI errors carry their own status (401, 403, 429…): don't pass that to the
    // browser as if it were ours. Report it (5xx) and offer the manual path.
    const e = error as { status?: number, message?: string }
    console.error('[onboarding] analysis failed', e.status, e.message)
    throw createError({
      statusCode: 502,
      statusMessage: 'We couldn\'t analyse that page right now. Describe your product instead, or try again in a minute.',
      cause: error,
      data: { upstreamStatus: e.status ?? null, upstreamMessage: e.message?.slice(0, 300) ?? null },
    })
  }
})
