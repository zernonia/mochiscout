/**
 * Cheap, no-LLM prefilter (arch §6 step 2): only threads that mention a
 * project's keywords or competitors, or its category together with an intent
 * phrase, are sent to the LLM. Tuned for recall; the LLM handles precision.
 */
export interface PrefilterProject {
  category: string | null
  keywords: string[]
  competitors: string[]
}

export const INTENT_PHRASES = [
  'alternative to',
  'alternatives to',
  'alternative for',
  'looking for',
  'recommend',
  'recommendation',
  'suggestions',
  'any tool',
  'any app',
  'is there a',
  'is there any',
  'what do you use',
  'what are you using',
  'best way to',
  'how do you',
  'switch from',
  'switching from',
  'frustrated',
  'struggling',
  'wish there was',
  'hate',
  'help with',
  'vs',
  'versus',
]

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'app', 'tool', 'tools', 'software', 'your', 'you', 'how', 'what'])

export function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
}

function hasPhrase(haystack: string, phrase: string) {
  const p = normalize(phrase)
  return p.trim().length > 0 && haystack.includes(p)
}

/** A multi-word keyword also matches when all its significant words appear. */
function hasAllWords(haystack: string, phrase: string) {
  const words = normalize(phrase).trim().split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w))
  return words.length >= 2 && words.every(w => haystack.includes(` ${w} `))
}

export function createMatcher(project: PrefilterProject) {
  return (text: string): string[] => {
    const haystack = normalize(text)
    const matched = new Set<string>()
    for (const k of project.keywords) {
      if (hasPhrase(haystack, k) || hasAllWords(haystack, k)) matched.add(k)
    }
    for (const c of project.competitors) {
      if (hasPhrase(haystack, c)) matched.add(c)
    }
    if (project.category && hasPhrase(haystack, project.category)) {
      const intent = INTENT_PHRASES.find(p => hasPhrase(haystack, p))
      if (intent) matched.add(`${project.category} + "${intent}"`)
    }
    return [...matched]
  }
}
