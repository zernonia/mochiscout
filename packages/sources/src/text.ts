const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' ',
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X'
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : match
    }
    return NAMED[code.toLowerCase()] ?? match
  })
}

/**
 * Remove whole elements (`<tag …>…</tag>`) in one linear pass. A regex with a
 * lazy body and a backreference rescans the rest of the page for every
 * unclosed opening tag, which turns a big bundled page into seconds of CPU;
 * an unclosed one here just drops the rest of the document.
 */
export function stripElements(html: string, tags: string[]): string {
  const lower = html.toLowerCase()
  const opens = new RegExp(`<(${tags.join('|')})\\b`, 'g')
  let out = ''
  let pos = 0
  let m: RegExpExecArray | null
  opens.lastIndex = 0
  while ((m = opens.exec(lower)) !== null) {
    if (m.index < pos) continue
    out += html.slice(pos, m.index)
    const close = lower.indexOf(`</${m[1]}`, m.index + m[0].length)
    if (close === -1) return `${out} `
    const end = lower.indexOf('>', close)
    pos = end === -1 ? html.length : end + 1
    opens.lastIndex = pos
    out += ' '
  }
  return out + html.slice(pos)
}

/** HTML → plain text, whitespace collapsed. */
export function htmlToText(html: string): string {
  return decodeEntities(
    stripElements(html, ['script', 'style'])
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}
