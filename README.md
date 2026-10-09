# Mochiscout

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

Nuxt 4 · coss ui (Vue) · Tailwind v4 · Cloudflare Workers (D1, KV, Cron) · TinyFish Search

## Local development

Requires Node 22+ and pnpm.

```sh
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # set NUXT_SESSION_PASSWORD, optional API keys
pnpm db:migrate:local                               # create the local D1 database
pnpm dev                                            # http://localhost:3000
```

Sign in with email and password (GitHub and Google when their OAuth keys are set). Without
`RESEND_API_KEY`, digest and invite emails are printed in the dev server log. Without
`ANTHROPIC_API_KEY` or `TINYFISH_API_KEY`, onboarding falls back to a manual form and
scoring / discovery wait until a key is set. Scheduled jobs can be run by hand at
`/_nitro/tasks/dispatch` and `/_nitro/tasks/discovery`.

```sh
pnpm test             # unit tests
pnpm typecheck
pnpm rules:validate   # subreddit rules (packages/rules)
```

## AI agents (MCP)

Pro plans and self-hosted instances expose an MCP server at `/mcp`. Create an API key in
**Settings → API keys**, then add it to Claude Code and install the skill in
[`skills/mochiscout`](skills/mochiscout/SKILL.md):

```sh
claude mcp add --transport http mochiscout https://<your-instance>/mcp --header "Authorization: Bearer sr_..."
```

## Docs

- [Architecture](docs/arch.md)
- [Self-hosting on Cloudflare](docs/self-host.md)
