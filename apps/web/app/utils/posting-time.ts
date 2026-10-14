/** Shape of PostingTime from @mochiscout/core after JSON. */
interface PostingTimeJson { peakStartHour: number, nextPeakAt: string | Date, goodNow: boolean }

/** "2 PM and 4 PM" in the viewer's time zone, plus how long until that window. */
export function describePostingTime(t: PostingTimeJson | null | undefined, now = new Date()) {
  if (!t) return null
  const hour = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric' })
  const start = new Date(now)
  start.setUTCHours(t.peakStartHour, 0, 0, 0)
  const end = new Date(start.getTime() + 2 * 3_600_000)
  const hoursAway = Math.round((new Date(t.nextPeakAt).getTime() - now.getTime()) / 3_600_000)
  return {
    window: `${hour(start)} and ${hour(end)}`,
    when: t.goodNow
      ? 'Now is one of its busier hours.'
      : hoursAway <= 0 ? 'That window is under way.' : hoursAway === 1 ? 'Next window in about an hour.' : `Next window in about ${hoursAway} hours.`,
    good: t.goodNow,
  }
}
