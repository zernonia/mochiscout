// Validate packages/rules/subreddits/*.yaml and write rules.json.
//   pnpm rules:build           write rules.json
//   pnpm rules:validate        fail if any file is invalid or rules.json is stale (CI)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { SubredditRules } from '../src/schema'

const root = join(fileURLToPath(import.meta.url), '../..')
const dir = join(root, 'subreddits')
const out = join(root, 'rules.json')
const check = process.argv.includes('--check')

const errors: string[] = []
const rules: SubredditRules[] = []
const seen = new Set<string>()

for (const file of readdirSync(dir).filter(f => f.endsWith('.yaml')).sort()) {
  const result = SubredditRules.safeParse(parse(readFileSync(join(dir, file), 'utf8')))
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    continue
  }
  const key = result.data.name.toLowerCase()
  if (basename(file, '.yaml') !== key) errors.push(`${file}: file name must be ${key}.yaml`)
  if (seen.has(key)) errors.push(`${file}: duplicate subreddit ${key}`)
  seen.add(key)
  rules.push(result.data)
}

if (errors.length) {
  console.error(`Invalid rules:\n  ${errors.join('\n  ')}`)
  process.exit(1)
}

const json = `${JSON.stringify(rules, null, 2)}\n`
if (check) {
  let current = ''
  try {
    current = readFileSync(out, 'utf8')
  }
  catch {}
  if (current !== json) {
    console.error('rules.json is out of date. Run `pnpm rules:build` and commit the result.')
    process.exit(1)
  }
  console.log(`${rules.length} subreddit rule files valid.`)
}
else {
  writeFileSync(out, json)
  console.log(`Wrote ${rules.length} rules to rules.json`)
}
