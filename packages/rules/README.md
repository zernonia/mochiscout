# Subreddit rules library

One YAML file per subreddit in `subreddits/`, bundled into the app as
`rules.json`. Licensed CC BY-SA 4.0. This is the only place rules come from:
nothing is read from Reddit at request time.

## How files are made

`pnpm rules:sync` reads each subreddit's **official rules**
(`reddit.com/r/<sub>/about/rules.json`, through TinyFish Fetch) and its pinned
posts, has a small model summarise what matters for promotion, and writes the
file with the official rules kept verbatim under `official`. It runs monthly in
`.github/workflows/rules-sync.yml` (repository secrets `TINYFISH_API_KEY` and
`ANTHROPIC_API_KEY`) and commits any changes to `main`.

```sh
pnpm rules:sync                  # the whole library, plus wanted.txt
pnpm rules:sync SaaS startups     # just these (added if new)
pnpm rules:build                 # validate and regenerate rules.json
pnpm rules:validate              # CI: validate and check rules.json is up to date
```

To add a subreddit, put its name in `wanted.txt` (or run the workflow with it).

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
