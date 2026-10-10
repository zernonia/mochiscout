interface MarketingSeo {
  title: string
  description: string
  /** Path on mochiscout.com, e.g. "/vs/gummysearch". */
  path: string
  type?: 'website' | 'article'
  imageAlt?: string
}

/** Title, description, canonical URL and social cards for a public marketing page. */
export function useMarketingSeo(opts: MarketingSeo) {
  const url = `${site.url}${opts.path === '/' ? '' : opts.path}`
  const image = `${site.url}/og.png`
  useSeoMeta({
    title: opts.title,
    description: opts.description,
    ogTitle: opts.title,
    ogDescription: opts.description,
    ogUrl: url,
    ogType: opts.type ?? 'website',
    ogSiteName: site.name,
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: opts.imageAlt ?? 'Mochiscout: find the people already asking for your product',
    twitterCard: 'summary_large_image',
    twitterTitle: opts.title,
    twitterDescription: opts.description,
    twitterImage: image,
  })
  useHead({ link: [{ rel: 'canonical', href: url }] })
}

/** Structured data (schema.org) for rich results. */
export function useJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  useHead({
    script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(Array.isArray(data) ? { '@context': 'https://schema.org', '@graph': data } : { '@context': 'https://schema.org', ...data }) }],
  })
}

/** Keep a page out of search results (app screens, sign-in). */
export function useNoIndex() {
  useSeoMeta({ robots: 'noindex, nofollow' })
}
