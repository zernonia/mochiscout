import { describe, expect, it } from 'vitest'
import { createHttp } from '@social-radar/sources'
import { assertPublicUrl, fetchProductPage, UnsafeUrlError } from '../src/onboarding'

describe('assertPublicUrl', () => {
  it('accepts public http(s) URLs', () => {
    expect(assertPublicUrl('https://example.com/pricing').hostname).toBe('example.com')
  })
  it.each([
    'ftp://example.com',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://[::1]/',
    'http://10.0.0.5',
    'http://intranet',
    'http://db.internal',
    'not a url',
  ])('rejects %s', (url) => {
    expect(() => assertPublicUrl(url)).toThrow(UnsafeUrlError)
  })
})

describe('fetchProductPage', () => {
  it('extracts title, description and body text', async () => {
    const html = `<html><head><title>Acme &amp; Co</title>
      <meta name="description" content="Invoices that chase themselves">
      </head><body><nav>Home Pricing</nav><h1>Get paid faster</h1><p>Automatic reminders.</p>
      <script>track()</script><footer>© Acme</footer></body></html>`
    const http = createHttp({
      userAgent: 't',
      minDelayMs: 0,
      fetch: async () => new Response(html, { status: 200 }),
    })
    const page = await fetchProductPage(http, 'https://acme.example.com')
    expect(page).toEqual({
      url: 'https://acme.example.com/',
      title: 'Acme & Co',
      description: 'Invoices that chase themselves',
      text: 'Get paid faster\nAutomatic reminders.',
    })
  })
})
