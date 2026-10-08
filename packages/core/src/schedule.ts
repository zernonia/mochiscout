export type JobName = 'plan-fetch' | 'search-discovery' | 'feeds' | 'score' | 'digest' | 'tracker' | 'research' | 'retention'

/**
 * One Cloudflare cron trigger fires every 15 minutes; this decides which jobs
 * are due on a given tick (UTC). Ticks may arrive a little late, so the minute
 * is floored to its 15-minute slot.
 *
 *   every tick   plan-fetch
 *   :00 hourly   feeds (HN, Bluesky, X searches)
 *   every tick   score (after fetch and discovery)
 *   :00 /6h      search-discovery
 *   :00 hourly   digest (per-user local hour is checked inside the job)
 *   :30 /12h     tracker
 *   04:00 /4h    research (weekly per project; a few projects per run)
 *   03:00        retention
 */
export function dueJobs(at: Date): JobName[] {
  const hour = at.getUTCHours()
  const slot = Math.floor(at.getUTCMinutes() / 15) * 15
  const jobs: JobName[] = ['plan-fetch']
  if (slot === 0 && hour % 6 === 0) jobs.push('search-discovery')
  if (slot === 0) jobs.push('feeds')
  jobs.push('score')
  if (slot === 0) jobs.push('digest')
  if (slot === 30 && hour % 12 === 0) jobs.push('tracker')
  if (slot === 0 && hour % 4 === 0) jobs.push('research')
  if (slot === 0 && hour === 3) jobs.push('retention')
  return jobs
}
