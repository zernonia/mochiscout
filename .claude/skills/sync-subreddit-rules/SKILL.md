---
name: sync-subreddit-rules
description: Refresh the subreddit rules library (packages/rules/subreddits/*.yaml) from each subreddit's official rules on Reddit, then validate, commit and push to main. Run by the monthly "Sync subreddit rules" routine; also use when asked to add or refresh subreddits in the rules library.
---

# Sync the subreddit rules library

The app reads subreddit rules only from `packages/rules/subreddits/*.yaml`
(bundled as `packages/rules/rules.json`). This skill refreshes those files
from each subreddit's **official rules** and pushes the result to `main`,
which deploys. Format and field meanings: `packages/rules/README.md` and
`packages/rules/src/schema.ts`.

## 1. Which subreddits

- Arguments, if given (names without `r/`): only those.
- Otherwise: every file in `packages/rules/subreddits/` plus every name in
  `packages/rules/wanted.txt` (ignore `#` comments), oldest `last_verified`
  first, **at most 40 per run**.

## 2. Fetch the official rules

Reddit blocks these URLs from cloud machines, so fetch them with the TinyFish
`fetch_content` tool (`format: "markdown"`, `ttl: 0`, up to 10 URLs per call,
so 5 subreddits per call):

- `https://www.reddit.com/r/<name>/about/rules.json`: the rules
- `https://www.reddit.com/r/<name>/about.json`: `data.display_name` (Reddit's
  casing, e.g. `SaaS`) and `data.public_description`

The text comes back as JSON inside a code fence. An error of `page_not_found`
or `login_required` means the sub is banned, private or gone: skip it and
mention it in the commit message. Any other error: skip it this run.

Map `rules[]`, sorted by `priority`, to `official`, **verbatim**:

```yaml
official:
  - title: <short_name>
    text: <description, HTML entities decoded (&amp; → &), trimmed, at most 1500 characters>
    kind: <kind: all | link (posts) | comment>
```

Copy the text exactly. Don't fix typos, reword or drop rules. Never use
`site_rules`.

## 3. Summarise for promotion

From the official rules, and from the sub's description and the existing
file, fill these fields. **Only record what the rules actually say. Never guess
from the subreddit's topic.**

| Field | Value |
|---|---|
| `promo_policy` | `none`, `weekly_thread_only`, `flair_only`, `allowed_with_value` or `allowed`. Rules that never mention self-promotion: `allowed_with_value`, and end `notes` with "The rules don't mention self-promotion." |
| `self_promo_thread` | Name of the promo thread or flair, if the rules name one; else keep the file's value; else `null` |
| `links_allowed` | `none`, `in_comments_only`, `yes`, or `null` if not stated |
| `min_karma`, `min_account_age_days` | Numbers only if stated, else `null` |
| `cooldown_days` | Days between promotional mentions, if stated ("1 mention every 60 days" is `60`), else `null` |
| `post_formats` | Only if the rules restrict formats, else `[]` |
| `tags` | 2 to 5 lowercase topic tags (`a-z`, `0-9`, `-`). Keep existing tags unless they're wrong |
| `notes` | At most two plain sentences a founder must know before mentioning their product: required disclosure, banned kinds of products, "comment before posting", no AI-written posts. Empty if nothing |

Then set `name` to the display name, `last_verified` to today (UTC,
`YYYY-MM-DD`), and `source` to `https://www.reddit.com/r/<display name>/about/rules`.

**Fields listed in the file's `keep:` were corrected by a person. Never change
them, and keep the `keep:` list.**

Write `packages/rules/subreddits/<lowercase name>.yaml` with the fields in this
order: name, promo_policy, self_promo_thread, min_karma, min_account_age_days,
links_allowed, post_formats, cooldown_days, tags, notes, keep (only if
non-empty), last_verified, source, official. Use block scalars (`|-`) for
multi-line rule text. New subreddits can stay in `wanted.txt`.

## 4. Validate

```sh
pnpm install --frozen-lockfile   # if node_modules is missing
pnpm rules:build                 # regenerates packages/rules/rules.json
pnpm rules:validate
pnpm --filter @mochiscout/rules test
```

Fix any file that fails validation; don't loosen the schema.

## 5. Commit and push

Stage only `packages/rules/`. Commit to `main` (this repo commits straight to
`main` until launch) with a message like:

```
chore(rules): sync N subreddits from official rules

Changed: r/SaaS (new promo limit), r/startups (added)
Skipped: r/foo (private)
```

Then `git push origin main`. If the push is rejected because `main` moved,
`git pull --rebase origin main` and push again. If nothing changed, don't
commit. Finish with a one-paragraph summary: subreddits checked, changed,
added and skipped, and any rule change a founder should know about (for
example, a sub that newly bans promotion).
