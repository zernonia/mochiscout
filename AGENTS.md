# Working on Mochiscout with an AI agent

Instructions for AI coding agents (Claude Code, Codex, Cursor and others) and the people steering them. Read [CONTRIBUTING.md](CONTRIBUTING.md) too; this file adds what an agent needs to get changes right the first time.

## What this is

Mochiscout finds people asking for a product on Reddit, Hacker News, Bluesky and X, scores each thread for buying intent, checks subreddit rules and drafts replies. **The user always posts themselves.** Never add code that posts, comments, votes or sends messages on anyone's behalf, and never use the Reddit API (public RSS and search only).

## Layout

| Path | What lives there |
| --- | --- |
| `apps/web` | Nuxt 4 app on Cloudflare Workers: `app/` (pages, components, composables), `server/api` (routes), `server/utils` (auto-imported helpers), `server/tasks` (cron jobs) |
| `apps/extension` | Optional browser extension (WXT) |
| `packages/core` | Business logic: jobs, scoring, drafting, research, plans and quotas. Put logic here, with a test, not in API routes |
| `packages/db` | Drizzle schema (`src/schema.ts`) and D1 migrations |
| `packages/sources` | Reddit/HN/Bluesky/X adapters, HTTP client, URL parsing |
| `packages/llm` | Anthropic client with structured (Zod) output |
| `packages/rules` | Subreddit rules library: one YAML per subreddit, bundled into `rules.json` |
| `skills/mochiscout` | Claude Code skill for the app's MCP tools (for users, not for working on this repo) |

## Commands

Run from the repo root. Node 22+, pnpm 10.

```sh
pnpm install            # also runs nuxt prepare / wxt prepare
pnpm dev                # http://localhost:3000 (needs apps/web/.dev.vars, see .dev.vars.example)
pnpm db:migrate:local   # apply migrations to the local D1
pnpm test               # Vitest in every package
pnpm typecheck          # tsc in packages + nuxt typecheck in apps/web
pnpm rules:validate     # after touching packages/rules
pnpm --filter @mochiscout/web build   # catches build-only errors CI doesn't run
```

**Before you say a change is done, run `pnpm test` and `pnpm typecheck` and read the output.** CI runs both plus `rules:validate` on every pull request.

## Conventions

- **Match the surrounding code.** Comments explain why, not what, and are rare. UI copy is plain, short and specific; no marketing words.
- **Database changes**: edit `packages/db/src/schema.ts`, run `pnpm db:generate`, rename the generated migration to something descriptive (`0014_reply_facts.sql`, and update `meta/_journal.json` to match), and commit it with the code that uses it.
- **API routes**: project routes start with `requireProject(event)` (or `requireDraft`), which checks the project belongs to the caller's org. Every query on project data also filters by `projectId`. Validate bodies with Zod and cap string lengths.
- **Money-spending endpoints** (LLM calls, searches, page fetches) need a limit: `rateLimit(event, key, …)` in `server/utils/rate-limit.ts`, a plan quota from `packages/core/src/plans.ts`, or both.
- **Editions**: `NUXT_PUBLIC_EDITION` is `selfhost` (default) or `cloud` (the hosted service: landing page, billing, analytics, public tools). Cloud-only pages and routes 404 on self-host; check how `pages/tools` and `requireCloud` do it.
- **Secrets** come from `getEnv(event)` (server) and are documented in `apps/web/.dev.vars.example` and `docs/self-host.md`. Never put a secret in `runtimeConfig.public`.
- **App UI**: components in `apps/web/app/components/ui` are a copied component kit; prefer composing them over editing them. The app's look is the "mochi" theme (`.theme-mochi` in `assets/css/main.css`): use `bg-brand`, `bg-brand-soft`, `text-brand-foreground` for the accent, `rounded-2xl` cards, and the shared `AppPageHeader`, `StatTile`, `SourceAvatar` and `AppEmpty` components. Light mode only.
- **Data fetching in app pages**: use `useCachedFetch` (lazy, client-only, stale-while-revalidate), never a top-level `await useFetch`, so pages render instantly with skeletons.
- **LLM prompts** (`packages/core/src/**`): keep what is stable per project in the system prompt (it is cached) and per-thread details in the user turn. Drafts must never invent facts; keep that guardrail.
- **Commits**: one logical change each, with a message that says what changed and why. Don't commit `.dev.vars`, `.env`, or eval exports (`labels*.json`).

## Gotchas that have bitten before

- `$fetch` on a templated route can fail typecheck with "excessive stack depth": give the URL a `string` type (`const url: string = …`) or pass an explicit generic.
- `useFetch`/`useLazyFetch` data is a shallow ref in Nuxt 4: mutating `data.value.list` won't re-render unless the fetch passes `deep: true`.
- Zod 4 `.partial()` still applies `.default()` values, so a partial update can overwrite fields that weren't sent. Only write the keys present in the request body (see `server/api/projects/[id].patch.ts`).
- Values rendered as `href` must be rebuilt from parsed parts (see `parseReplyUrl` in `packages/sources`), never stored raw. Escape anything interpolated into email HTML.
- A KV namespace (`env.CACHE`) is eventually consistent; it's fine for rate limits and caches, not for anything that must be exact.
- Reddit blocks most cloud IPs for JSON endpoints; server code reads RSS, or goes through the page-fetch service (`tinyfishFetcher`).

## Subreddit rules library

`packages/rules/subreddits/<name>.yaml`, validated by `packages/rules/src/schema.ts`. Quote the subreddit's own rules under `official`, link its rules page as `source`, and list hand-corrected fields under `keep` so the sync leaves them alone. Run `pnpm rules:build` after editing. The `.claude/skills/sync-subreddit-rules` skill is the maintainers' monthly sync; contributors just edit the YAML.
