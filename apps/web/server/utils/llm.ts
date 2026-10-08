import type { Llm } from '@social-radar/llm'
import type { Env } from './env'
import { createLlm } from '@social-radar/llm'

/** The configured LLM, or null when no provider key is set. */
export function getLlm(env: Env): Llm | null {
  if (!env.ANTHROPIC_API_KEY) return null
  return createLlm({
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    baseURL: env.ANTHROPIC_BASE_URL,
    models: {
      ...(env.LLM_FAST_MODEL ? { fast: env.LLM_FAST_MODEL } : {}),
      ...(env.LLM_QUALITY_MODEL ? { quality: env.LLM_QUALITY_MODEL } : {}),
    },
  })
}
