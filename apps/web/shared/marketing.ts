import { COMPETITORS } from './competitors'
import { FREE_TOOLS } from './tools'

/** Public pages for the sitemap. Bump `updated` when a page's content changes. */
export const MARKETING_PAGES: { path: string, updated: string, priority: number }[] = [
  { path: '/', updated: '2026-10-10', priority: 1 },
  { path: '/alternatives', updated: '2026-10-10', priority: 0.8 },
  ...COMPETITORS.map(c => ({ path: `/alternatives/${c.slug}`, updated: c.verified, priority: c.slug === 'gummysearch' ? 0.9 : 0.7 })),
  { path: '/tools', updated: '2026-10-12', priority: 0.8 },
  ...FREE_TOOLS.map(t => ({ path: `/tools/${t.slug}`, updated: t.updated, priority: 0.8 })),
  { path: '/terms', updated: '2026-10-09', priority: 0.2 },
  { path: '/privacy', updated: '2026-10-10', priority: 0.2 },
]
