# Self-hosting on Cloudflare

Mochiscout runs as one Cloudflare Worker with a D1 database, a KV namespace and
one cron trigger. You need a Cloudflare account, Node 22+ and pnpm.

## 1. Install

```sh
git clone https://github.com/zernonia/mochiscout.git
cd mochiscout
pnpm install
cd apps/web
pnpm exec wrangler login
```

All commands below run from `apps/web`.

## 2. Create the database and cache

```sh
pnpm exec wrangler d1 create mochiscout
pnpm exec wrangler kv namespace create CACHE
```

Copy the two ids they print into `wrangler.jsonc`:

- `d1_databases[0].database_id`
- `kv_namespaces[0].id`

The ids already in `wrangler.jsonc` belong to mochiscout.com; they're not secrets,
but deploys from a fork fail until you replace them. While you're there:

- `placement` pins the Worker near the Anthropic API and the D1 primary (US East).
  Keep it if your D1 database is in North America, or remove it.
- `send_email` needs Cloudflare Email Service; remove it if you send email through
  Resend or not at all (see step 3).
- `keep_vars` keeps variables you set in the dashboard across deploys.

Then create the tables:

```sh
pnpm db:migrate:remote
```

## 3. Set secrets

Generate a session secret and set it, plus the URL the app will live at
(`https://mochiscout.<your-subdomain>.workers.dev` unless you add a custom domain):

```sh
openssl rand -hex 32 | pnpm exec wrangler secret put NUXT_SESSION_PASSWORD
pnpm exec wrangler secret put APP_URL
```

**Sign-in methods:**

| Method | Secrets | Notes |
|---|---|---|
| Email + password | none | Always on. Email addresses are not verified yet, so password accounts can't accept team invites; use GitHub or Google for that. |
| GitHub | `NUXT_OAUTH_GITHUB_CLIENT_ID`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET` | OAuth app callback URL: `<APP_URL>/auth/github` |
| Google | `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | Authorized redirect URI: `<APP_URL>/auth/google` |

**Features and the keys they need:**

| Secret | Used for | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Onboarding from URL, intent scoring, research, drafts, tone checks | Manual onboarding and empty drafts only; matching threads wait in the queue unscored |
| `TINYFISH_API_KEY` | Thread and subreddit discovery, research searches, and reading each subreddit's official rules (free key) | Only watched subreddits are read; rules come from pinned posts and the curated files |
| `BRAVE_API_KEY` | Search fallback when TinyFish fails or rate-limits | No fallback |
| `EMAIL_FROM` + email provider | Daily digest, team invites | Emails are skipped |
| `X_BEARER_TOKEN` | X (Twitter) as a feed source, through the official paid API | X stays off |
| `CONTACT_URL` | Contact link in the User-Agent sent to reddit.com | `APP_URL`, then this repository's URL |
| `READ_MODE` | `server` (default), `extension` or `search_only`; see Things to know | Server-side RSS reads |

Optional: `SEARCH_PROVIDER=brave` (use Brave first), `LLM_FAST_MODEL` / `LLM_BALANCED_MODEL` / `LLM_QUALITY_MODEL`
(defaults `claude-haiku-5-5` for scoring, `claude-sonnet-5-5` for auto-drafts, `claude-opus-5-5` for drafts you ask for), `ANTHROPIC_BASE_URL` (route through
Cloudflare AI Gateway: `https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/anthropic`),
`CONTACT_URL` (contact link in the User-Agent sent to Reddit; use your fork or site).

Set each with `pnpm exec wrangler secret put NAME`.

**Email.** Digests and team invites go out through one of two providers:

- **Cloudflare Email Service** (default in `wrangler.jsonc`): onboard your sending domain in
  Cloudflare Email Service (Workers Paid plan), then set `EMAIL_FROM`, for example
  `Mochiscout <hello@yourdomain.com>`. The `send_email` binding named `EMAIL` is already configured.
- **Resend**: set `RESEND_API_KEY` and `EMAIL_FROM` (verify the domain in Resend), and remove the
  `send_email` block from `wrangler.jsonc` if your account doesn't use Email Service.

With both set, Cloudflare is tried first and Resend is the fallback if a send fails.

## 4. Deploy

```sh
pnpm run deploy
```

Open the URL and sign up straight away: **the first account to sign up owns the
instance.** Later sign-ups are refused unless the email is in `ALLOWED_EMAILS`
(comma-separated) or was invited from **Settings → Team** and signs in with GitHub
or Google. Password accounts aren't email-verified, so anyone who knows an address
in `ALLOWED_EMAILS` could claim it; prefer invites with GitHub/Google sign-in.

## 5. Check the scheduled jobs

`wrangler.jsonc` defines one cron trigger (`*/15 * * * *`). Each tick the dispatcher
decides what is due: RSS fetch, scoring, lead checks (archived or removed posts, full thread text),
auto-drafts and hot-lead alerts every tick, the digest hourly, discovery
every 6 hours, research every 4 hours for projects whose last run is over a week old,
the tracker every 12 hours and cleanup daily.

Watch them run:

```sh
pnpm exec wrangler tail
```

Lines starting with `[jobs]` show each job's result.

## Updating

```sh
git pull
pnpm install
cd apps/web
pnpm db:migrate:remote
pnpm run deploy
```

## Things to know

- **Reddit rate limits.** Logged-out requests are limited to roughly one per minute
  per IP. Watched subreddits are fetched together as combined feeds, and fetching
  pauses until the next tick when the limit is hit. Busy subs are checked every
  15 minutes and quiet ones every 1-6 hours.
- **If Reddit blocks your Worker.** Set `READ_MODE=extension` to stop server-side RSS
  reads and use the [browser extension](../apps/extension/README.md), which sends the
  posts you browse to `/api/ingest`. `READ_MODE=search_only` relies on search discovery
  alone.
- **Workers plan.** The free plan allows 10 ms of CPU per invocation, which large
  feeds and scoring batches can exceed. The Workers Paid plan ($5/month) is the
  safe choice for reliable scheduled jobs.
- **Subreddit rules.** `packages/rules` ships rules for popular SaaS, indie and app
  subreddits. Subreddits that aren't in it get their official rules read
  automatically when watched (needs `TINYFISH_API_KEY` and `ANTHROPIC_API_KEY`). To
  add or fix one, edit or add a YAML file (see `packages/rules/README.md`), run
  `pnpm rules:build` from the repo root and redeploy, or send a pull request.

## Running the hosted edition

The same code runs the paid cloud: set `NUXT_PUBLIC_EDITION=cloud` (as a build-time
variable in your Workers Build, or a Worker variable). That turns on the landing page,
plans and quotas, and billing. Billing needs `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`,
`POLAR_PRODUCT_SOLO` and `POLAR_PRODUCT_PRO` (`POLAR_SERVER=sandbox` for testing); point a
Polar webhook at `<APP_URL>/api/webhooks/polar` with the `subscription.*` events. Before
launch, `NUXT_PUBLIC_WAITLIST=true` replaces sign-up with a waitlist. Set `NUXT_PUBLIC_POSTHOG_KEY` to send product analytics to
PostHog (US cloud), proxied through `/ingest` on your own domain; self-hosted instances never load it.

## Local development

See [CONTRIBUTING.md](../CONTRIBUTING.md#development-setup).
