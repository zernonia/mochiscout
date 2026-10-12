/** The free tools, for the /tools hub, navigation and the sitemap. */
export const FREE_TOOLS = [
  {
    slug: 'reddit-lead-finder',
    name: 'Reddit lead finder',
    tagline: 'Find people on Reddit and Hacker News asking for what you sell.',
    description: 'Type what you sell and see recent Reddit and Hacker News threads where people ask for a recommendation, compare tools or look for an alternative. Free, no sign-up.',
    updated: '2026-10-12',
  },
  {
    slug: 'subreddit-rules',
    name: 'Subreddit rules checker',
    tagline: 'Can you promote in r/whatever? Check before you post.',
    description: 'Look up any subreddit\'s self-promotion rules: whether you can mention your product, where links are allowed, karma limits and the full official rules. Free, no sign-up.',
    updated: '2026-10-12',
  },
] as const

export type FreeToolSlug = typeof FREE_TOOLS[number]['slug']

export function freeTool(slug: FreeToolSlug) {
  return FREE_TOOLS.find(t => t.slug === slug)!
}
