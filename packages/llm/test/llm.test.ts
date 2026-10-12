import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createLlm, LlmRefusalError } from '../src'

const Schema = z.object({ intent: z.number(), kind: z.enum(['pain', 'other']) })

function message(text: string, extra: Record<string, unknown> = {}) {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    usage: { input_tokens: 10, output_tokens: 5 },
    ...extra,
  }
}

function fakeFetch(responses: unknown[]) {
  const bodies: Record<string, any>[] = []
  const headers: Headers[] = []
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)))
    headers.push(new Headers(init?.headers))
    return new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return { fetch: fetch as typeof globalThis.fetch, bodies, headers }
}

const call = { system: 's', prompt: 'p', schema: Schema }

describe('createLlm', () => {
  it('fast tier: Haiku, low effort, JSON schema output', async () => {
    const f = fakeFetch([message('{"intent":80,"kind":"pain"}')])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    const res = await llm.generate({ tier: 'fast', ...call })
    expect(res.data).toEqual({ intent: 80, kind: 'pain' })
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
    const body = f.bodies[0]!
    expect(body.model).toBe('claude-haiku-5-5')
    expect(body.output_config.effort).toBe('low')
    expect(body.output_config.format.type).toBe('json_schema')
    expect(body).not.toHaveProperty('fallbacks')
  })

  it('quality tier: Opus with server-side refusal fallback', async () => {
    const f = fakeFetch([message('{"intent":1,"kind":"other"}', { model: 'claude-opus-5-5' })])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    await llm.generate({ tier: 'quality', ...call })
    expect(f.bodies[0]).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default' })
    expect(f.headers[0]!.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
  })

  it('retries once when output does not match the schema', async () => {
    const f = fakeFetch([message('{"intent":"high"}'), message('{"intent":5,"kind":"other"}')])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    await expect(llm.generate({ tier: 'fast', ...call })).resolves.toMatchObject({ data: { intent: 5 } })
    expect(f.bodies).toHaveLength(2)
  })

  it('gives up after the retry', async () => {
    const f = fakeFetch([message('nope'), message('still nope')])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    await expect(llm.generate({ tier: 'fast', ...call })).rejects.toBeTruthy()
    expect(f.bodies).toHaveLength(2)
  })

  it('surfaces refusals without retrying', async () => {
    const f = fakeFetch([message('', {
      content: [],
      stop_reason: 'refusal',
      stop_details: { type: 'refusal', category: 'cyber', explanation: null },
    })])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    await expect(llm.generate({ tier: 'fast', ...call })).rejects.toBeInstanceOf(LlmRefusalError)
    expect(f.bodies).toHaveLength(1)
  })

  it('model overrides per tier', async () => {
    const f = fakeFetch([message('{"intent":1,"kind":"other"}')])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch, models: { fast: 'claude-sonnet-5-5' } })
    await llm.generate({ tier: 'fast', ...call })
    expect(f.bodies[0]!.model).toBe('claude-sonnet-5-5')
    expect(f.bodies[0]!.fallbacks).toBe('default')
  })
})


describe('max_tokens floor', () => {
  it('leaves room for thinking on the quality tier, and keeps larger requested caps', async () => {
    const f = fakeFetch([message('{"intent":1,"kind":"other"}', { model: 'claude-opus-5-5' }), message('{"intent":1,"kind":"other"}')])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    await llm.generate({ tier: 'quality', ...call, maxTokens: 3000 })
    await llm.generate({ tier: 'fast', ...call, maxTokens: 8000 })
    expect(f.bodies[0]!.max_tokens).toBe(16000)
    expect(f.bodies[1]!.max_tokens).toBe(8000)
  })
})

describe('effort and caching', () => {
  it('overrides the tier effort and marks the system prompt cacheable', async () => {
    const f = fakeFetch([message('{"intent":1,"kind":"other"}', { model: 'claude-sonnet-5-5', usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 900 } })])
    const llm = createLlm({ anthropicApiKey: 'k', fetch: f.fetch })
    const res = await llm.generate({ tier: 'balanced', ...call, effort: 'low', cacheSystem: true })
    const body = f.bodies[0]!
    expect(body.model).toBe('claude-sonnet-5-5')
    expect(body.output_config.effort).toBe('low')
    expect(body.system).toEqual([{ type: 'text', text: 's', cache_control: { type: 'ephemeral' } }])
    expect(res.usage.inputTokens).toBe(1000)
  })
})
