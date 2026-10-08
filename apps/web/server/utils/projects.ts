import type { NuxtRequestEvent as RequestEvent } from 'nuxt/server'
import { and, eq, schema } from '@social-radar/db'
import { z } from 'zod'

const list = (max: number) => z.array(z.string().trim().min(1).max(100)).max(max).default([])

export const ProjectInput = z.object({
  url: z.string().trim().url().max(2048),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(100).nullish(),
  icp: z.string().trim().max(1000).nullish(),
  problems: list(12),
  keywords: list(30),
  competitors: list(12),
  searchTerms: list(40),
  sources: z.array(z.enum(['hn', 'bluesky', 'x'])).max(3).default([]),
})

/** The project in the route, if it belongs to the signed-in user's org; 404 otherwise. */
export async function requireProject(event: RequestEvent, param = 'id') {
  const { user, org } = await requireUser(event)
  const id = getRouterParam(event, param)!
  const project = await getDb(event)
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.orgId, org.id)))
    .get()
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return { user, org, project }
}

export function researchLockKey(projectId: string) {
  return `research:running:${projectId}`
}
