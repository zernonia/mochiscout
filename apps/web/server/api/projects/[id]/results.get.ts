import { attributionInstalled, projectResults, scoringQuality } from '@mochiscout/core'
import { z } from 'zod'

const Query = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) })

/** What replying brought: replies posted, how many stayed up, visits and sign-ups from tracking links. */
export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  const { days } = await getValidatedQuery(event, Query.parse)
  const db = getDb(event)
  const [results, installed, quality] = await Promise.all([
    projectResults(db, project.id, { days }),
    attributionInstalled(db, project.id),
    scoringQuality(db, project),
  ])
  return { ...results, installed, projectUrl: project.url, quality, threshold: project.intentThreshold }
})
