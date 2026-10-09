# Mochiscout reader (browser extension)

A read-only fallback for when server-side reads from reddit.com are blocked
(docs/arch.md §5). While you browse Reddit, it reads the posts already on the
page and sends them to your Mochiscout instance, where they go through the
same matching and scoring as RSS.

It never posts, comments, votes, messages, clicks or loads pages for you.

## Use

1. In Mochiscout, **Settings → API keys → Create key**.
2. Build and load the extension:
   ```sh
   pnpm --filter @mochiscout/extension build      # Chrome: .output/chrome-mv3
   pnpm --filter @mochiscout/extension build:firefox
   ```
   Chrome: `chrome://extensions` → Developer mode → Load unpacked → `apps/extension/.output/chrome-mv3`.
3. Open the extension popup, enter your instance URL and the key, and allow access when asked.

To rely on the extension alone, set `READ_MODE=extension` on the server; it then stops
fetching Reddit RSS itself.
