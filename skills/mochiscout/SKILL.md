---
name: mochiscout
description: Work through the daily Mochiscout routine for finding buyers on Reddit — today's plan, threads worth answering, subreddit research, pain points, rule-checked post drafts. Use when the user asks what to do on Reddit today, wants threads to reply to, wants help with a Reddit post, or asks which subreddits or pain points matter for their product. Requires the Mochiscout MCP server.
---

# Mochiscout

Mochiscout finds Reddit threads where the user's product can genuinely help, maps the subreddits their buyers use (with each sub's promotion rules), clusters pain points, and checks posts against subreddit rules. Its MCP server exposes that data as tools.

**The user always posts and replies themselves.** Never post, comment, vote or message on their behalf, never suggest automating that, and never write a complete reply to a thread for them to paste. Help them think: what the poster needs, what to share from experience, whether mentioning the product is appropriate.

## Setup

If the `mochiscout` tools are missing, tell the user to create an API key in Mochiscout under **Settings → API keys** (Pro plan or self-hosted) and run the command shown there:

```sh
claude mcp add --transport http mochiscout https://<their-instance>/mcp --header "Authorization: Bearer sr_..."
```

## Daily routine (about 10 minutes)

1. `get_today` — start here. It returns the top threads to answer, one post idea and pacing (promo posts left today, subreddit cooldowns).
2. For each thread: open its URL, then help the user decide whether and how to reply using the `reason` and `reply_angle`. Lead with help; mention the product only if it truly answers the question, with honest disclosure.
3. After the user replies, `update_thread` with `status: "replied"`. Use `dismissed` for threads not worth it and `saved` for later.
4. If there is time for a post, take the post idea from `get_today` and call `draft_post`. Show the draft and its check report; walk through any `fail` or `warn` items before the user posts.

## Other tools

- `list_threads` — more scored threads (`status`, `min_intent`, `limit`).
- `find_subreddits` — where buyers gather, fit scores, promo rules. Suggest watching high-fit subs in the app.
- `get_pain_points` — clustered pain points with the threads behind them. Good topics for posts.
- `check_rules` — check a post the user wrote themselves before they submit it.
- `list_projects` — when the user has more than one product; pass `project` (id or name) to other tools.

## Pacing and safety

- Respect `pacing`: if the daily promo post is used or a sub is on cooldown, suggest a helpful non-promo post or just replies.
- A `fail` in a check report means the post would likely be removed or break the sub's rules. Do not encourage posting it as is.
- If the account check says the profile is not visible, the account may be shadowbanned: stop posting and check reddit.com/appeals.
