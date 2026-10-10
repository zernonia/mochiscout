import { MARKETING_PAGES } from '#shared/marketing'

export default defineEventHandler((event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const origin = getRequestURL(event).origin
  const urls = MARKETING_PAGES.map(p => `  <url><loc>${origin}${p.path === '/' ? '' : p.path}</loc><lastmod>${p.updated}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`)
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
