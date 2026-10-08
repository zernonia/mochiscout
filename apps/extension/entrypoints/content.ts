import type { PagePost } from '../utils/parse'
import { parsePosts } from '../utils/parse'

// Reads posts already on the page you are viewing. Never clicks, scrolls or loads anything.
export default defineContentScript({
  matches: ['https://www.reddit.com/*', 'https://old.reddit.com/*'],
  runAt: 'document_idle',
  main() {
    const sent = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined

    const collect = () => {
      const fresh: PagePost[] = parsePosts(document).filter(p => !sent.has(p.fullname))
      if (!fresh.length) return
      fresh.forEach(p => sent.add(p.fullname))
      browser.runtime.sendMessage({ type: 'posts', posts: fresh }).catch(() => {})
    }

    collect()
    // Infinite scroll and client-side navigation add posts later.
    new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(collect, 2000)
    }).observe(document.body, { childList: true, subtree: true })
  },
})
