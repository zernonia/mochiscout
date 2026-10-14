export type JobName = 'plan-fetch' | 'search-discovery' | 'feeds' | 'score' | 'digest' | 'tracker' | 'research' | 'retention' | 'lead-checks' | 'auto-replies' | 'hot-alerts' | 'insights' | 'trials' | 'reply-watch'

/**
 * One Cloudflare cron trigger fires every 15 minutes; this decides which jobs
 * are due on a given tick (UTC). Ticks may arrive a little late, so the minute
 * is floored to its 15-minute slot.
 *
 *   every tick   plan-fetch
 *   :00 hourly   feeds (HN, Bluesky, X searches)
 *   every tick   score (after fetch and discovery)
 *   every tick   lead-checks (after score; reply state and full text of new leads)
 *   every tick   auto-replies (hot leads in projects with auto-replies on)
 *   every tick   hot-alerts (email new hot leads; at most hourly per project)
 *   :00 /6h      search-discovery
 *   :00 hourly   digest (per-user local hour is checked inside the job)
 *   :30 /12h     tracker
 *   04:00 /4h    research (weekly per project; a few projects per run)
 *   03:00        retention
 *   05:00        insights (pooled subreddit stats, rules from pinned posts)
 *   :15 hourly   trials (end expired Pro trials, "ending soon" emails)
 *   :45 hourly   reply-watch (responses under replies founders posted)
 */
export function dueJobs(at: Date): JobName[] {
  const hour = at.getUTCHours()
  const slot = Math.floor(at.getUTCMinutes() / 15) * 15
  const jobs: JobName[] = ['plan-fetch']
  if (slot === 0 && hour % 6 === 0) jobs.push('search-discovery')
  if (slot === 0) jobs.push('feeds')
  jobs.push('score')
  jobs.push('lead-checks', 'auto-replies', 'hot-alerts')
  if (slot === 0) jobs.push('digest')
  if (slot === 30 && hour % 12 === 0) jobs.push('tracker')
  if (slot === 0 && hour % 4 === 0) jobs.push('research')
  if (slot === 0 && hour === 3) jobs.push('retention')
  if (slot === 0 && hour === 5) jobs.push('insights')
  if (slot === 15) jobs.push('trials')
  if (slot === 45) jobs.push('reply-watch')
  return jobs
}
