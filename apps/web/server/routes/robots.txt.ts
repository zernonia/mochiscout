// Hosted edition: index the marketing pages only. Self-hosted instances are private tools: index nothing.
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  if (useRuntimeConfig(event).public.edition !== 'cloud') return 'User-agent: *\nDisallow: /\n'
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app',
    'Disallow: /api/',
    'Disallow: /auth/',
    'Disallow: /ingest/',
    'Disallow: /mcp',
    'Disallow: /login',
    '',
    `Sitemap: ${getRequestURL(event).origin}/sitemap.xml`,
    '',
  ].join('\n')
})
