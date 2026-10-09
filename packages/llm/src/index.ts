import type { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

/**
 * LLM layer (docs/arch.md §9). Three tiers:
 * - fast: scoring, extraction, clustering (high volume, cheap)
 * - balanced: background reply drafts for hot leads
 * - quality: drafts the user asks for, rule checks
 * Every call returns JSON validated against a zod schema, with one retry on
 * a parse failure. Anthropic is the first provider; others can implement
 * `Llm` later.
 */
export type Tier = 'fast' | 'balanced' | 'quality'

export const DEFAULT_MODELS: Record<Tier, string> = {
  fast: 'claude-haiku-5-5',
  balanced: 'claude-sonnet-5-5',
  quality: 'claude-opus-5-5',
}

const EFFORT: Record<Tier, 'low' | 'medium' | 'high'> = { fast: 'low', balanced: 'medium', quality: 'high' }

/** Models that accept server-side refusal fallback (`fallbacks: "default"`). */
const SERVER_FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'])

export interface LlmConfig {
  anthropicApiKey: string
  /** e.g. a Cloudflare AI Gateway URL ending in /anthropic. */
  baseURL?: string
  models?: Partial<Record<Tier, string>>
  /** For tests. */
  fetch?: typeof fetch
}

export interface GenerateOptions<S extends z.ZodType> {
  tier: Tier
  system: string
  prompt: string
  schema: S
  maxTokens?: number
}

export interface GenerateResult<T> {
  data: T
  model: string
  usage: { inputTokens: number, outputTokens: number }
}

export class LlmRefusalError extends Error {
  constructor(readonly category: string | null) {
    super(`The model declined this request${category ? ` (${category})` : ''}`)
    this.name = 'LlmRefusalError'
  }
}

export class LlmParseError extends Error {
  constructor(readonly stopReason: string | null) {
    super(`Model output did not match the schema (stop_reason: ${stopReason})`)
    this.name = 'LlmParseError'
  }
}

export interface Llm {
  models: Record<Tier, string>
  generate: <S extends z.ZodType>(opts: GenerateOptions<S>) => Promise<GenerateResult<z.infer<S>>>
}

export function createLlm(config: LlmConfig): Llm {
  const client = new Anthropic({
    apiKey: config.anthropicApiKey,
    baseURL: config.baseURL,
    fetch: config.fetch,
  })
  const models = { ...DEFAULT_MODELS, ...config.models }

  async function once<S extends z.ZodType>(opts: GenerateOptions<S>) {
    const model = models[opts.tier]
    const base = {
      model,
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: 'user' as const, content: opts.prompt }],
    }

    if (SERVER_FALLBACK_MODELS.has(model)) {
      // On a safety-classifier decline the API retries on Anthropic's recommended fallback model.
      const res = await client.beta.messages.parse({
        ...base,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { format: betaZodOutputFormat(opts.schema), effort: EFFORT[opts.tier] },
      })
      return {
        parsed: res.parsed_output as z.infer<S> | null,
        stopReason: res.stop_reason,
        refusalCategory: res.stop_details?.category ?? null,
        model: res.model,
        usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
      }
    }

    const res = await client.messages.parse({
      ...base,
      output_config: { format: zodOutputFormat(opts.schema), effort: EFFORT[opts.tier] },
    })
    return {
      parsed: res.parsed_output as z.infer<S> | null,
      stopReason: res.stop_reason,
      refusalCategory: res.stop_details?.category ?? null,
      model: res.model,
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    }
  }

  async function generate<S extends z.ZodType>(opts: GenerateOptions<S>): Promise<GenerateResult<z.infer<S>>> {
    const usage = { inputTokens: 0, outputTokens: 0 }
    let stopReason: string | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Awaited<ReturnType<typeof once<S>>>
      try {
        res = await once(opts)
      }
      catch (error) {
        // Output that fails schema validation throws while parsing; retry once.
        if (attempt === 0 && !(error instanceof Anthropic.APIError)) continue
        throw error
      }
      usage.inputTokens += res.usage.inputTokens
      usage.outputTokens += res.usage.outputTokens
      stopReason = res.stopReason
      if (res.stopReason === 'refusal') throw new LlmRefusalError(res.refusalCategory)
      if (res.parsed != null) return { data: res.parsed, model: res.model, usage }
    }
    throw new LlmParseError(stopReason)
  }

  return { models, generate }
}

export { z } from 'zod'
