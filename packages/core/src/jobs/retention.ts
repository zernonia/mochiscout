import type { JobContext } from './context'
import { sql } from '@social-radar/db'

const RETAIN_DAYS = 90

/** Prune threads older than 90 days that no project scored. */
export async function runRetention(ctx: JobContext) {
  const cutoff = Math.floor(ctx.now().getTime() / 1000) - RETAIN_DAYS * 86_400
  const result = await ctx.db.run(sql`
    delete from threads
    where ingested_at < ${cutoff}
      and not exists (select 1 from thread_scores s where s.thread_id = threads.id)
  `)
  const deleted = result.meta.changes ?? 0
  ctx.log('retention', { deleted })
  return { deleted }
}
