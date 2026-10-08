/** A post as read from a reddit.com page; matches the /api/ingest body. */
export interface PagePost {
  fullname: string
  subreddit: string
  title: string
  permalink: string
  author: string | null
  createdAt: string | number | null
  body: string | null
}

/** New Reddit renders posts as <shreddit-post> elements with data in attributes. */
function fromShreddit(el: Element): PagePost | null {
  const fullname = el.getAttribute('id') ?? ''
  const subreddit = el.getAttribute('subreddit-prefixed-name') ?? el.getAttribute('subreddit-name') ?? ''
  const title = el.getAttribute('post-title') ?? ''
  if (!fullname.startsWith('t3_') || !subreddit || !title) return null
  const body = el.querySelector('[slot="text-body"]')?.textContent?.trim() ?? null
  return {
    fullname,
    subreddit,
    title,
    permalink: el.getAttribute('permalink') ?? '',
    author: el.getAttribute('author'),
    createdAt: el.getAttribute('created-timestamp'),
    body: body || null,
  }
}

/** Old Reddit: .thing elements with data-* attributes. */
function fromOldReddit(el: Element): PagePost | null {
  const fullname = el.getAttribute('data-fullname') ?? ''
  const subreddit = el.getAttribute('data-subreddit') ?? ''
  const title = el.querySelector('a.title')?.textContent?.trim() ?? ''
  if (!fullname.startsWith('t3_') || !subreddit || !title) return null
  const ts = Number(el.getAttribute('data-timestamp'))
  const body = el.querySelector('.expando .md')?.textContent?.trim() ?? null
  return {
    fullname,
    subreddit,
    title,
    permalink: el.getAttribute('data-permalink') ?? '',
    author: el.getAttribute('data-author'),
    createdAt: Number.isFinite(ts) && ts > 0 ? ts : null,
    body: body || null,
  }
}

/** Every post visible on the page (listing or thread). */
export function parsePosts(root: ParentNode): PagePost[] {
  const posts = [
    ...[...root.querySelectorAll('shreddit-post')].map(fromShreddit),
    ...[...root.querySelectorAll('.thing.link[data-fullname]')].map(fromOldReddit),
  ]
  const byId = new Map<string, PagePost>()
  for (const p of posts) {
    if (p && !byId.has(p.fullname)) byId.set(p.fullname, p)
  }
  return [...byId.values()]
}
