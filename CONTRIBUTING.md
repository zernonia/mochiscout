# Contributing to Mochiscout

Thanks for helping! Bug reports, subreddit rule fixes and pull requests are all welcome.

## Ways to help

- **Subreddit rules**: the rules library in [`packages/rules/subreddits`](packages/rules/subreddits) is the easiest place to start. If a rule is wrong or a subreddit is missing, open a [rules issue](.github/ISSUE_TEMPLATE/subreddit-rules.md) or a pull request editing the YAML. See [`packages/rules/README.md`](packages/rules/README.md).
- **Bugs and ideas**: open an issue with steps to reproduce, or describe the problem you want solved.
- **Code**: for anything larger than a small fix, open an issue first so we can agree on the approach.

## Development setup

You need Node 22+ and pnpm 10.

```sh
pnpm install                                        # also runs nuxt prepare / wxt prepare
cp apps/web/.dev.vars.example apps/web/.dev.vars   # set NUXT_SESSION_PASSWORD
pnpm db:migrate:local                               # local D1 database
pnpm dev                                            # http://localhost:3000
```

The app works without any API keys: onboarding falls back to a manual form and scoring waits until `ANTHROPIC_API_KEY` is set. Add `TINYFISH_API_KEY` (free) for discovery.

## Before you open a pull request

```sh
pnpm test             # unit tests (Vitest)
pnpm typecheck        # every package and the Nuxt app
pnpm rules:validate   # if you touched packages/rules
```

CI runs the same commands on every pull request.

## Conventions

- **Repository layout**: the Nuxt app lives in `apps/web`, the browser extension in `apps/extension`, and shared logic in `packages/*` (`core` jobs and scoring, `db` schema, `sources` Reddit/HN/Bluesky/X adapters, `llm`, `rules`). Put logic in a package with a test rather than in an API route.
- **Database changes**: edit `packages/db/src/schema.ts`, run `pnpm db:generate`, give the migration a descriptive name, and commit it with the code that uses it.
- **Style**: match the surrounding code. Comments explain why, not what. Keep UI copy plain and short.
- **Principles**: Mochiscout never posts, comments, votes or messages for anyone, and never uses the Reddit API. Changes that automate posting won't be accepted.
- **Commits**: one logical change per commit, with a message that says what changed and why.

## Using an AI coding agent

AI-assisted contributions are welcome. [AGENTS.md](AGENTS.md) gives agents (Claude Code, Codex, Cursor and others) the layout, commands, conventions and known pitfalls; Claude Code loads it automatically through `CLAUDE.md`. You're still responsible for the change: read the diff, run the tests, and say in the pull request what you checked.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind.

## License

By contributing you agree that your contributions are licensed under the [AGPL-3.0](LICENSE), and contributions to the subreddit rules data under [CC BY-SA 4.0](packages/rules/LICENSE).
