import { publicSubreddits } from '@mochiscout/core'
import { MARKETING_PAGES } from '#shared/marketing'

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const origin = getRequestURL(event).origin
  // Subreddit pages with real data only; thin ones are noindex and stay out.
  const subs = (await publicSubreddits(getDb(event))).filter(s => s.indexable)
  const pages = [
    ...MARKETING_PAGES,
    ...(subs.length ? [{ path: '/subreddits', updated: subs[0]!.statsAt?.toISOString().slice(0, 10) ?? '2026-10-10', priority: 0.7 }] : []),
    ...subs.map(s => ({ path: `/subreddits/${s.name}`, updated: s.statsAt?.toISOString().slice(0, 10) ?? '2026-10-10', priority: 0.6 })),
  ]
  const urls = pages.map(p => `  <url><loc>${origin}${p.path === '/' ? '' : p.path}</loc><lastmod>${p.updated}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`)
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
