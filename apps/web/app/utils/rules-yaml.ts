export interface RulesSuggestion {
  name: string
  promo_policy: 'none' | 'weekly_thread_only' | 'flair_only' | 'allowed_with_value' | 'allowed'
  self_promo_thread: string
  min_karma: string
  min_account_age_days: string
  links_allowed: '' | 'none' | 'in_comments_only' | 'yes'
  post_formats: string[]
  cooldown_days: string
  tags: string
  notes: string
  source: string
}

const quote = (s: string) => JSON.stringify(s)
const num = (s: string) => (s.trim() && Number.isFinite(Number(s)) ? String(Math.round(Number(s))) : 'null')

/** A packages/rules/subreddits/<name>.yaml file in the format the validator expects. */
export function rulesYaml(r: RulesSuggestion, today = new Date().toISOString().slice(0, 10)) {
  const tags = r.tags.split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')).filter(Boolean)
  return [
    `name: ${r.name}`,
    `promo_policy: ${r.promo_policy}`,
    `self_promo_thread: ${r.self_promo_thread.trim() ? quote(r.self_promo_thread.trim()) : 'null'}`,
    `min_karma: ${num(r.min_karma)}`,
    `min_account_age_days: ${num(r.min_account_age_days)}`,
    `links_allowed: ${r.links_allowed || 'null'}`,
    `post_formats: [${r.post_formats.join(', ')}]`,
    `cooldown_days: ${num(r.cooldown_days)}`,
    `tags: [${tags.join(', ')}]`,
    `notes: ${quote(r.notes.trim())}`,
    `last_verified: ${today}`,
    `source: ${r.source.trim() || `https://www.reddit.com/r/${r.name}/about/rules`}`,
  ].join('\n')
}

export function rulesIssueUrl(repo: string, r: RulesSuggestion, yaml: string) {
  const body = `Suggested rules for r/${r.name}, checked against the subreddit's rules page and sidebar.\n\nFile: \`packages/rules/subreddits/${r.name.toLowerCase()}.yaml\`\n\n\`\`\`yaml\n${yaml}\n\`\`\``
  const params = new URLSearchParams({ title: `Rules: r/${r.name}`, body, labels: 'rules' })
  return `https://github.com/${repo}/issues/new?${params}`
}
