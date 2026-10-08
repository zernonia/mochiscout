---
name: Subreddit rules
about: Add or correct a subreddit in the rules database
title: "Rules: r/"
labels: rules
---

Checked against the subreddit's rules page and sidebar on: <!-- date -->

File: `packages/rules/subreddits/<name>.yaml`

```yaml
name:
promo_policy:            # none | weekly_thread_only | flair_only | allowed_with_value | allowed
self_promo_thread: null
min_karma: null          # null when the sub doesn't publish it
min_account_age_days: null
links_allowed: null      # none | in_comments_only | yes
post_formats: [text]
cooldown_days: 7
tags: []
notes: ""
last_verified:
source: https://www.reddit.com/r/<name>/about/rules
```
