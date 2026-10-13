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

const MAKER_ASKING = ['alternative', 'looking for', 'recommend', 'suggestions', 'is there', 'any tool', 'any app', 'switch from', 'switching from', 'help with', 'need a', 'need help']

const MAKER_TITLE = [
  /\b(i|we)\s+(just\s+|finally\s+|recently\s+)?(made|built|created|launched|developed|coded|shipped|released|designed|vibe[- ]?coded)\b(?!\s+(the|a)\s+(mistake|switch|decision|move)\b)/i,
  /\b(i|we)('m|'re|\s+am|\s+are)\s+(building|making|launching|developing)\b/i,
  /^\s*(show hn|launch hn)\s*:/i,
  /\b([Ii]ntroducing|[Aa]nnouncing)\s+[A-Z]/,
  /\bmy\s+(new\s+|first\s+)?(side project|app|saas|startup|tool|extension|website|product)\b.*\b(feedback|launch|live|beta|roast)\b/i,
]

/**
 * A post whose title says its author made something is a launch or showcase,
 * not a request, whatever the model makes of it. The title is the only
 * reliable signal: search snippets mix in text from other threads. A title
 * that also asks for something ("we built on Bubble, any alternative?") is
 * still a lead.
 */
export function isMakerPost(title: string) {
  if (!MAKER_TITLE.some(r => r.test(title))) return false
  const t = normalize(title)
  return !/\?\s*$/.test(title.trim()) && !MAKER_ASKING.some(p => t.includes(normalize(p)))
}
