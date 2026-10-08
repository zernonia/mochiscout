/** Reddit usernames: 3-20 letters, digits, - or _. Accepts u/name and profile URLs. */
export function normalizeRedditUsername(input: string): string | null {
  const name = input.trim().replace(/^(https?:\/\/(www\.|old\.)?reddit\.com)?\/?(u|user)\//i, '').replace(/\/.*$/, '')
  return /^[\w-]{3,20}$/.test(name) ? name : null
}
