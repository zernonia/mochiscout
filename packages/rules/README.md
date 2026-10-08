# Subreddit rules

Community-maintained promo rules, one YAML file per subreddit in `subreddits/`.
Licensed CC BY-SA 4.0.

```yaml
name: SaaS
promo_policy: allowed_with_value   # none | weekly_thread_only | flair_only | allowed_with_value | allowed
self_promo_thread: null            # name of the weekly promo thread, if any
min_karma: null                    # null = not published
min_account_age_days: null
links_allowed: in_comments_only    # none | in_comments_only | yes | null
post_formats: [text]
cooldown_days: 7                   # suggested gap between promo posts
tags: [saas, startups, b2b]
notes: "What mods remove, what performs well."
last_verified: 2026-10-08
source: https://www.reddit.com/r/SaaS/about/rules
```

Only record what the rules page (or wiki) says. Leave a field `null` when the
sub doesn't publish it. Update `last_verified` whenever you re-check a file.

```sh
pnpm rules:build      # validate and regenerate rules.json
pnpm rules:validate   # CI: validate and check rules.json is up to date
```
