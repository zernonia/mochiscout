import type { SubredditRules } from '@mochiscout/rules'
import type { ThreadComment } from '@mochiscout/sources'

/**
 * Cheap text signals read from a thread: other people saying they want the
 * same thing, and an explicit invitation to send a private message. Both
 * only ever point the founder at people who asked; nothing is sent for them.
 */

/** "Same here", "following", "did you find one?", "I'm also looking for…". */
const SAME_NEED = /\b(?:same (?:here|problem|issue|question|boat|situation)|me too|following(?: this)?|did (?:you|anyone) (?:ever )?find|any (?:luck|updates?)|(?:also|too) (?:looking|searching|interested)|i(?:'m| am) (?:also )?(?:looking|searching) for|looking for (?:the same|this too|something similar)|i need this too|interested too|commenting (?:to follow|for visibility))\b|(?:^|\s)\+1\b/i
/** A comment longer than this is an answer or a story, not a "me too". */
const SAME_NEED_MAX = 400
const ALSO_ASKING_MAX = 5

/** Commenters (not the original poster) who want what the post asks for. */
export function alsoAsking(comments: ThreadComment[] | null | undefined, opAuthor: string | null | undefined): ThreadComment[] {
  if (!comments?.length) return []
  const op = opAuthor?.toLowerCase()
  return comments
    .filter(c => c.author && c.author.toLowerCase() !== op && c.text.length <= SAME_NEED_MAX && SAME_NEED.test(c.text))
    .slice(0, ALSO_ASKING_MAX)
}

/** "DM me", "feel free to PM", "my DMs are open", "send me a message". */
const INVITES_DM = /\b(?:dm me|pm me|message me|(?:feel free|happy for you) to (?:dm|pm|message)|(?:send|shoot|drop) me (?:a )?(?:dm|pm|message|chat)|my dms are open|dms (?:are )?open|(?:happy|glad) to (?:chat|talk) (?:in|over|via) (?:dms?|pms?|chat))\b/i

export function invitesDm(text: string | null | undefined): boolean {
  return !!text && INVITES_DM.test(text)
}

/** Someone answering the founder asks to be messaged or sent the link privately. */
const ASKS_FOR_DM = /\b(?:dm me|pm me|message me|(?:can|could) you (?:dm|pm|message) me|send me (?:the |a )?(?:link|details|info|dm|pm|message)|(?:send|shoot) me (?:a )?(?:dm|pm))\b/i

export function asksForDm(text: string | null | undefined): boolean {
  return !!text && ASKS_FOR_DM.test(text)
}

/** Rules saying no DMs, no unsolicited messages, or no asking people to DM you. */
const NO_DMS = /\b(?:no|not|don'?t|do not|never|without)\b[^.\n]{0,40}\b(?:dms?|pms?|private messages?|direct messages?)\b|\bunsolicited (?:dms?|pms?|messages?|chats?)\b|\basking (?:people|users|others|members) to (?:dm|pm|message)\b/i

export function dmsDiscouraged(rules: SubredditRules | null | undefined): boolean {
  if (!rules) return false
  return NO_DMS.test([rules.notes, ...rules.official.map(r => `${r.title}. ${r.text ?? ''}`)].join('\n'))
}

/** Platforms where a private message exists and people can invite one. */
const DM_PLATFORMS = new Set(['reddit', 'bluesky', 'x'])

/** The author asked for private messages, on a platform that has them, where the community doesn't discourage it. */
export function openToDms(thread: { platform: string, title: string, body?: string | null, snippet?: string | null }, rules: SubredditRules | null | undefined): boolean {
  if (!DM_PLATFORMS.has(thread.platform) || dmsDiscouraged(rules)) return false
  return invitesDm(`${thread.title}\n${thread.body ?? thread.snippet ?? ''}`)
}
