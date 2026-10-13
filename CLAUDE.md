# Mochiscout

@AGENTS.md

## Maintainers: the hosted service (mochiscout.com)

This section is for the maintainers who run mochiscout.com. Contributors can skip it: open pull requests as usual, and nothing here applies to forks or self-hosted instances.

- **Deploys**: `main` deploys to production through Cloudflare Workers Builds on every push. Maintainers commit to `main` directly until launch.
- **Database**: production D1 `mochiscout` (`ea663c06-44e3-4650-97a3-051b68085757`). After `pnpm db:generate`, apply new migrations to production **before** pushing code that uses them.

### Production errors

Server errors go to **PostHog error tracking**, project **Mochiscout (id 655070)**, as `$exception` events:

- 5xx and uncaught request errors (`server/plugins/errors.ts`): `source: request`, with `path`, `method`, `status_code`, and the user id as `distinct_id` when signed in.
- Failed cron and queue jobs (`server/utils/jobs.ts`, any `ctx.log('… failed', { error })`): `source: cron`.
- Browser errors via posthog-js (`capture_exceptions`).
- Local dev reports are tagged `environment: development`; filter on `environment = 'production'`.

With the PostHog MCP: run `switch-project 655070` first (the account has other projects), then `query-error-tracking-issues-list`, or SQL such as:

```sql
SELECT timestamp, properties.$exception_list[1].value, properties.path, properties.source
FROM events WHERE event = '$exception' AND properties.environment = 'production'
ORDER BY timestamp DESC LIMIT 20
```

Cloudflare Workers Logs (`observability` in `wrangler.jsonc`) has full console output in the dashboard, but the Cloudflare MCP can't read it.
