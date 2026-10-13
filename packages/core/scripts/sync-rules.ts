// Refresh the rules library (packages/rules/subreddits/*.yaml) from each
// subreddit's official rules, then rebuild rules.json.
//
//   pnpm rules:sync                 every file in the library, plus packages/rules/wanted.txt
//   pnpm rules:sync SaaS startups   just these subs (added if new)
//
// Needs TINYFISH_API_KEY (reads reddit.com/r/<sub>/about/rules.json, which
// Reddit blocks for datacenter IPs) and ANTHROPIC_API_KEY (one small Haiku
// call per sub). Fields listed in a file's `keep` were corrected by hand and
// are left alone. The monthly Claude routine does the same without keys
// (.claude/skills/sync-subreddit-rules/SKILL.md); this script is for running it elsewhere.
import type { SubredditRules } from '@mochiscout/rules'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLlm } from '@mochiscout/llm'
import { SubredditRules as RulesSchema } from '@mochiscout/rules'
import { createHttp, normalizeSubreddit, tinyfishFetcher, userAgent } from '@mochiscout/sources'
import { parse, stringify } from 'yaml'
import { readSubredditRules } from '../src/subreddits/rules'

const rulesDir = join(fileURLToPath(import.meta.url), '../../../rules')
const subsDir = join(rulesDir, 'subreddits')

const tinyfishKey = process.env.TINYFISH_API_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY
if (!tinyfishKey || !anthropicKey) {
  console.error('Set TINYFISH_API_KEY and ANTHROPIC_API_KEY.')
  process.exit(1)
}

const existing = readdirSync(subsDir).filter(f => f.endsWith('.yaml')).map(f => f.slice(0, -5))
const wantedFile = join(rulesDir, 'wanted.txt')
const wanted = existsSync(wantedFile)
  ? readFileSync(wantedFile, 'utf8').split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean)
  : []
const args = process.argv.slice(2)
const names = [...new Set((args.length ? args : [...existing, ...wanted]).map(n => normalizeSubreddit(n.replace(/^\/?r\//i, ''))).filter(n => /^\w{2,21}$/.test(n)))]

const http = createHttp({ userAgent: userAgent(process.env.CONTACT_URL ?? 'https://github.com/zernonia/mochiscout'), minDelayMs: 1500 })
const llm = createLlm({ anthropicApiKey: anthropicKey })
const pages = tinyfishFetcher(tinyfishKey, { ttlSeconds: 0 })
const today = new Date().toISOString().slice(0, 10)

/** Field order of the files (stable diffs). */
const ORDER: (keyof SubredditRules)[] = ['name', 'promo_policy', 'self_promo_thread', 'min_karma', 'min_account_age_days', 'links_allowed', 'post_formats', 'cooldown_days', 'tags', 'notes', 'keep', 'last_verified', 'source', 'official']

const summary = { updated: 0, added: 0, unchanged: 0, missing: [] as string[], failed: [] as string[], inputTokens: 0, outputTokens: 0 }

for (const name of names) {
  const file = join(subsDir, `${name}.yaml`)
  const before = existsSync(file) ? RulesSchema.parse(parse(readFileSync(file, 'utf8'))) : null
  try {
    const res = await readSubredditRules(http, llm, pages, name, today)
    if (res.status === 'missing') {
      summary.missing.push(name)
      continue
    }
    summary.inputTokens += res.usage.inputTokens
    summary.outputTokens += res.usage.outputTokens
    const next: SubredditRules = { ...res.rules }
    if (before) {
      for (const field of before.keep) (next as Record<string, unknown>)[field] = before[field]
      next.keep = before.keep
    }
    // Only the date changed: keep the file as is so the diff shows real changes.
    if (before && sameRules(before, next)) {
      summary.unchanged++
      continue
    }
    const ordered = Object.fromEntries(ORDER.map(k => [k, next[k]]).filter(([k, v]) => !(k === 'keep' && !(v as string[]).length)))
    writeFileSync(file, stringify(ordered, { lineWidth: 0, blockQuote: 'literal' }))
    before ? summary.updated++ : summary.added++
    console.log(`${before ? 'updated' : 'added'} r/${next.name}`)
  }
  catch (error) {
    summary.failed.push(name)
    console.error(`r/${name}: ${String(error)}`)
  }
}

function sameRules(a: SubredditRules, b: SubredditRules) {
  const strip = (r: SubredditRules) => JSON.stringify({ ...r, last_verified: '' })
  return strip(a) === strip(b)
}

execFileSync('pnpm', ['--filter', '@mochiscout/rules', 'build'], { stdio: 'inherit' })
console.log(JSON.stringify(summary))
if (summary.failed.length && summary.failed.length === names.length) process.exit(1)
