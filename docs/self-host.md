# Self-hosting on Cloudflare

social-radar runs as one Cloudflare Worker with a D1 database, a KV namespace and
one cron trigger. You need a Cloudflare account, Node 22+ and pnpm.

## 1. Install

```sh
git clone https://github.com/zernonia/social-radar.git
cd social-radar
pnpm install
cd apps/web
pnpm exec wrangler login
```

All commands below run from `apps/web`.

## 2. Create the database and cache

```sh
pnpm exec wrangler d1 create social-radar
pnpm exec wrangler kv namespace create CACHE
```

Copy the two ids they print into `wrangler.jsonc`:

- `d1_databases[0].database_id`
- `kv_namespaces[0].id`

Then create the tables:

```sh
pnpm db:migrate:remote
```

## 3. Set secrets

Generate a session secret and set it, plus the URL the app will live at
(`https://social-radar.<your-subdomain>.workers.dev` unless you add a custom domain):

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
| `TINYFISH_API_KEY` | Thread and subreddit discovery, research searches (free key) | Only watched subreddits are read |
| `BRAVE_API_KEY` | Search fallback when TinyFish fails or rate-limits | No fallback |
| `RESEND_API_KEY` | Daily digest, team invites | Emails are skipped |

Optional: `SEARCH_PROVIDER=brave` (use Brave first), `LLM_FAST_MODEL` / `LLM_QUALITY_MODEL`
(defaults `claude-haiku-5-5` / `claude-opus-5-5`), `ANTHROPIC_BASE_URL` (route through
Cloudflare AI Gateway: `https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/anthropic`),
`CONTACT_URL` (contact link in the User-Agent sent to Reddit; use your fork or site),
`EMAIL_FROM` (sender for Resend, like `social-radar <radar@yourdomain.com>`; verify the domain in Resend).

Set each with `pnpm exec wrangler secret put NAME`.

## 4. Deploy

```sh
pnpm run deploy
```

Open the URL and sign in. **The first account to sign up owns the instance**; later
sign-ups are refused unless their email is in `ALLOWED_EMAILS` (comma-separated).

## 5. Check the scheduled jobs

`wrangler.jsonc` defines one cron trigger (`*/15 * * * *`). Each tick the dispatcher
decides what is due: RSS fetch and scoring every tick, the digest hourly, discovery
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
- **Subreddit rules.** The rules database in `packages/rules` starts empty. Add a
  YAML file per subreddit you post in (see `packages/rules/README.md`), run
  `pnpm rules:build` from the repo root, and redeploy.

## Running the hosted edition

The same code runs the paid cloud: set `NUXT_PUBLIC_EDITION=cloud` (as a build-time
variable in your Workers Build, or a Worker variable). That turns on the landing page,
plans and quotas, and billing. Billing needs `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`,
`POLAR_PRODUCT_SOLO` and `POLAR_PRODUCT_PRO` (`POLAR_SERVER=sandbox` for testing); point a
Polar webhook at `<APP_URL>/api/webhooks/polar` with the `subscription.*` events. Before
launch, `NUXT_PUBLIC_WAITLIST=true` replaces sign-up with a waitlist.

## Local development

See the README: `pnpm dev` runs the app against local D1/KV with secrets from
`apps/web/.dev.vars`.
