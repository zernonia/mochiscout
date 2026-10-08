# social-radar

> Working name. Open-source research + marketing radar: find the people who need your product on Reddit (then HN, Bluesky and more), understand their pain points, and show up helpfully without getting banned.

**Status:** pre-alpha, private. Building in public soon.

## The loop

**Research → Map → Watch → Draft → Track**

1. **Research** pain points your buyers talk about.
2. **Map** the subreddits they gather in, with each sub's promo rules.
3. **Watch** for buying-intent threads in a daily feed.
4. **Draft** rule-checked posts. You always post and reply yourself.
5. **Track** what you posted: removals and shadowbans.

## Principles

- No Reddit API, no auto-posting, no DMs, no vote manipulation.
- Self-host free on your own Cloudflare account, or use the hosted cloud.

## Stack

Nuxt 4 · shadcn-vue · Tailwind v4 · Cloudflare Workers (D1, KV, Cron) · TinyFish Search

## Docs

- [Architecture](docs/arch.md)
