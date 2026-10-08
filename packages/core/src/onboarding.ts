import type { Llm } from '@social-radar/llm'
import type { Http } from '@social-radar/sources'
import { z } from '@social-radar/llm'
import { decodeEntities, htmlToText, truncate } from '@social-radar/sources'

export const ProductProfile = z.object({
  product: z.string().describe('Product name'),
  category: z.string().describe('Short product category, 1-3 words, as a buyer would search for it (e.g. "crm", "invoicing app")'),
  icp: z.string().describe('Ideal customer profile in one or two sentences: who buys this and in what situation'),
  problems_solved: z.array(z.string()).describe('3-8 problems the product solves, phrased the way a frustrated user would describe them'),
  keywords: z.array(z.string()).describe('5-15 short search phrases buyers use when looking for this kind of product'),
  competitors: z.array(z.string()).describe('Up to 8 well-known competing products or common alternatives, by name only'),
  search_terms: z.array(z.string()).describe('20-30 short phrases (2-5 words) people would write in a post when they have the problem or want a tool like this, e.g. "looking for a crm", "spreadsheet crm hell". Varied, specific, no brand names'),
})
export type ProductProfile = z.infer<typeof ProductProfile>

export class UnsafeUrlError extends Error {}

const PAGE_TEXT_MAX = 15_000

/** Public http(s) URLs only: the server must not be steered at internal hosts. */
export function assertPublicUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    throw new UnsafeUrlError('Not a valid URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new UnsafeUrlError('Only http(s) URLs are supported')
  const host = url.hostname.toLowerCase()
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')
  if (isIp || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) {
    throw new UnsafeUrlError('Use the public domain of your product')
  }
  return url
}

export interface ProductPage {
  url: string
  title: string
  description: string
  text: string
}

/** Fetch a landing page and reduce it to the text an LLM needs. */
export async function fetchProductPage(http: Http, input: string): Promise<ProductPage> {
  const url = assertPublicUrl(input).toString()
  const res = await http.getText(url, { headers: { Accept: 'text/html,application/xhtml+xml' } })
  if (res.status !== 'ok') throw new Error('Unexpected 304 for product page')
  const html = res.body

  const meta = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i')
    const tag = html.match(re)?.[0]
    return tag ? decodeEntities(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '').trim() : ''
  }
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html
  const text = htmlToText(body.replace(/<(nav|footer|svg|noscript|iframe)[\s\S]*?<\/\1>/gi, ' '))

  return {
    url,
    title,
    description: meta('description') || meta('og:description'),
    text: truncate(text, PAGE_TEXT_MAX),
  }
}

const SYSTEM = `You help founders find their buyers on Reddit. Given the text of a product's landing page, describe the product the way its buyers would: plain words, no marketing language. Only name competitors you are confident exist; return an empty list rather than guessing.`

export async function extractProductProfile(llm: Llm, page: ProductPage) {
  const prompt = [
    `URL: ${page.url}`,
    `Title: ${page.title}`,
    page.description ? `Meta description: ${page.description}` : '',
    '',
    'Page text:',
    '<page>',
    page.text,
    '</page>',
  ].filter(line => line !== '').join('\n')

  const res = await llm.generate({ tier: 'fast', system: SYSTEM, prompt, schema: ProductProfile, maxTokens: 6000 })
  const clean = (items: string[], max: number) =>
    [...new Set(items.map(s => s.trim()).filter(Boolean))].slice(0, max)
  return {
    ...res,
    data: {
      ...res.data,
      problems_solved: clean(res.data.problems_solved, 8),
      keywords: clean(res.data.keywords, 15),
      competitors: clean(res.data.competitors, 8),
      search_terms: clean(res.data.search_terms, 30),
    },
  }
}
