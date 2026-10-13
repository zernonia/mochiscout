# Subreddit rules library

One YAML file per subreddit in `subreddits/`, bundled into the app as
`rules.json`. Licensed CC BY-SA 4.0. This is the only place rules come from:
nothing is read from Reddit at request time.

## Contributing a subreddit

Open a pull request adding or editing `subreddits/<name>.yaml` (format below; run
`pnpm rules:build`), or open a [subreddit rules issue](../../.github/ISSUE_TEMPLATE/subreddit-rules.md).
Quote the subreddit's own rules under `official` and link its rules page as `source`.

## How files are made

The maintainers run a monthly Claude Code routine ("Sync subreddit rules") that follows
`.claude/skills/sync-subreddit-rules/SKILL.md`: it fetches each subreddit's
**official rules** (`reddit.com/r/<sub>/about/rules.json`, through the TinyFish
connector, since Reddit blocks cloud IPs), keeps them verbatim under `official`,
summarises what matters for promotion, validates, and pushes to `main`.

To add a subreddit, put its name in `wanted.txt`, or ask Claude in this repo to
"sync the rules for r/<name>".

When a user watches a subreddit that isn't here yet, the app reads its official
rules right away (stored in D1 as a stopgap, shown as "joins the rules library
at the next sync"), and lists it at `/api/public/rules-pending`. The routine
adds those first, and from then on this file is used.

```sh
pnpm rules:build                 # validate and regenerate rules.json
pnpm rules:validate              # CI: validate and check rules.json is up to date
pnpm rules:sync SaaS startups    # optional, outside Claude: same sync as a script
                                 # (needs TINYFISH_API_KEY and ANTHROPIC_API_KEY)
```

## Correcting a file

Edit the field and list it under `keep`, so the next sync leaves it alone:

```yaml
name: SaaS
promo_policy: allowed_with_value   # none | weekly_thread_only | flair_only | allowed_with_value | allowed
self_promo_thread: null            # name of the promo thread or flair, if any
min_karma: null                    # null = not published
min_account_age_days: null
links_allowed: yes                 # none | in_comments_only | yes | null
post_formats: []
cooldown_days: 60                  # days between promotional mentions, if stated
tags: [saas, startups, b2b]
notes: Disclose affiliation. Tools for lead or opportunity detection are banned.
keep: [notes]
last_verified: 2026-10-12
source: https://www.reddit.com/r/SaaS/about/rules
official:                          # verbatim, written by the sync
  - title: No Vendor Spam on posts or comments
    text: Promotion is allowed occasionally...
    kind: all                      # all | link (posts) | comment
```

## In the app

Each project can keep its own copy of a subreddit's rules (Subreddits page,
"Edit for this project"). Drafts and checks in that project follow the copy;
everything else uses this library.
