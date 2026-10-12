import { publicSubreddits } from '@mochiscout/core'
import { MARKETING_PAGES } from '#shared/marketing'

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).public.edition !== 'cloud') throw createError({ statusCode: 404 })
  const origin = getRequestURL(event).origin
  // Subreddit pages with real data only; thin ones are noindex and stay out.
  const subs = (await publicSubreddits(getDb(event))).filter(s => s.indexable)
  const pages = [
    ...MARKETING_PAGES,
    ...(subs.length ? [{ path: '/subreddits', updated: latest(subs), priority: 0.7 }] : []),
    ...subs.map(s => ({ path: `/subreddits/${s.name}`, updated: updatedOn(s), priority: 0.6 })),
  ]
  const urls = pages.map(p => `  <url><loc>${origin}${p.path === '/' ? '' : p.path}</loc><lastmod>${p.updated}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`)
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})

type Sub = Awaited<ReturnType<typeof publicSubreddits>>[number]
/** Newer of the rules check and the stats refresh. */
function updatedOn(s: Sub) {
  const stats = s.statsAt?.toISOString().slice(0, 10) ?? ''
  const rules = s.rules?.last_verified ?? ''
  return (stats > rules ? stats : rules) || '2026-10-12'
}
function latest(subs: Sub[]) {
  return subs.map(updatedOn).sort().at(-1)!
}
