import type { Db } from '@social-radar/db'
import type { Env } from './env'
import { ANGLES, buildToday, latestPainPoints, listThreads, normalizeSubredditName, setThreadStatus, subredditMap } from '@social-radar/core'
import { asc, eq, schema } from '@social-radar/db'
import { getRules } from '@social-radar/rules'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker'
import { z } from 'zod'

interface McpContext {
  db: Db
  env: Env
  userId: string
  orgId: string
}

const projectArg = z.string().optional().describe('Project id or name. Defaults to the first project.')

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function toolError(error: unknown) {
  const e = error as { statusMessage?: string, message?: string }
  return { isError: true, content: [{ type: 'text' as const, text: e.statusMessage ?? e.message ?? 'Something went wrong' }] }
}

/** social-radar as MCP tools (arch §7.8). Read-mostly; nothing here posts to Reddit. */
export function createMcpServer(ctx: McpContext) {
  const server = new McpServer(
    { name: 'social-radar', version: '0.1.0' },
    {
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
      instructions: 'social-radar finds Reddit threads where the user\'s product can help and checks posts against subreddit rules. The user always posts and replies themselves: never suggest automating posting, commenting or voting. Start with get_today.',
    },
  )

  async function project(ref?: string) {
    const projects = await ctx.db.select().from(schema.projects)
      .where(eq(schema.projects.orgId, ctx.orgId)).orderBy(asc(schema.projects.createdAt))
    const found = ref
      ? projects.find(p => p.id === ref || p.name.toLowerCase() === ref.toLowerCase())
      : projects[0]
    if (!found) throw new Error(ref ? `No project "${ref}". Call list_projects.` : 'No projects yet. Create one in the app first.')
    return found
  }

  const run = <A>(fn: (args: A) => Promise<unknown>) => async (args: A) => {
    try {
      return json(await fn(args))
    }
    catch (error) {
      return toolError(error)
    }
  }

  server.registerTool('list_projects', {
    title: 'List projects',
    description: 'The user\'s projects (products they are finding buyers for).',
    annotations: { readOnlyHint: true },
  }, run(async () => {
    const rows = await ctx.db.select({ id: schema.projects.id, name: schema.projects.name, url: schema.projects.url, category: schema.projects.category })
      .from(schema.projects).where(eq(schema.projects.orgId, ctx.orgId)).orderBy(asc(schema.projects.createdAt))
    return rows
  }))

  server.registerTool('get_today', {
    title: 'Today\'s plan',
    description: 'Top threads worth answering today, one post idea, and pacing (promo posts left today, subreddit cooldowns).',
    inputSchema: { project: projectArg },
    annotations: { readOnlyHint: true },
  }, run(async ({ project: ref }: { project?: string }) => buildToday(ctx.db, await project(ref))))

  server.registerTool('list_threads', {
    title: 'List scored threads',
    description: 'Reddit threads scored for buying intent, highest first, with why and a suggested reply angle. The user writes the reply.',
    inputSchema: {
      project: projectArg,
      status: z.enum(['new', 'saved', 'replied', 'dismissed']).optional().describe('Default new'),
      min_intent: z.number().int().min(0).max(100).optional().describe('Default: the project\'s threshold (60)'),
      limit: z.number().int().min(1).max(100).optional(),
    },
    annotations: { readOnlyHint: true },
  }, run(async (a: { project?: string, status?: 'new' | 'saved' | 'replied' | 'dismissed', min_intent?: number, limit?: number }) =>
    listThreads(ctx.db, await project(a.project), { status: a.status, minIntent: a.min_intent, limit: a.limit ?? 20 })))

  server.registerTool('update_thread', {
    title: 'Update a thread',
    description: 'Mark a thread as replied (after the user replied themselves), saved, dismissed, or back to new.',
    inputSchema: {
      project: projectArg,
      thread_id: z.string().describe('Thread id from list_threads, e.g. reddit:t3_abc123'),
      status: z.enum(['new', 'saved', 'replied', 'dismissed']),
    },
    annotations: { idempotentHint: true },
  }, run(async (a: { project?: string, thread_id: string, status: 'new' | 'saved' | 'replied' | 'dismissed' }) => {
    const row = await setThreadStatus(ctx.db, (await project(a.project)).id, a.thread_id, a.status)
    if (!row) throw new Error('Thread not found for this project')
    return row
  }))

  server.registerTool('find_subreddits', {
    title: 'Subreddit map',
    description: 'Subreddits where the project\'s buyers show up, with fit score, evidence and each sub\'s promotion rules (when known).',
    inputSchema: { project: projectArg },
    annotations: { readOnlyHint: true },
  }, run(async ({ project: ref }: { project?: string }) => subredditMap(ctx.db, await project(ref))))

  server.registerTool('get_pain_points', {
    title: 'Pain points',
    description: 'Pain points from the latest research run, with the Reddit threads behind each.',
    inputSchema: { project: projectArg },
    annotations: { readOnlyHint: true },
  }, run(async ({ project: ref }: { project?: string }) => latestPainPoints(ctx.db, (await project(ref)).id)))

  server.registerTool('check_rules', {
    title: 'Check a post against subreddit rules',
    description: 'Deterministic checks for a post the user wrote: promotion policy, links, format, karma and account age, cooldowns and the daily promo cap.',
    inputSchema: {
      subreddit: z.string(),
      title: z.string(),
      body: z.string(),
      mentions_product: z.boolean().describe('Whether the post mentions the user\'s product (a promo post)'),
    },
    annotations: { readOnlyHint: true },
  }, run(async (a: { subreddit: string, title: string, body: string, mentions_product: boolean }) => {
    const subreddit = normalizeSubredditName(a.subreddit)
    if (!subreddit) throw new Error('Not a valid subreddit name')
    const report = buildReport(
      { subreddit, title: a.title, body: a.body, promo: a.mentions_product },
      await draftCheckContext(ctx.db, ctx.userId, ctx.orgId),
    )
    return { ...report, rules: getRules(subreddit) ?? null }
  }))

  server.registerTool('draft_post', {
    title: 'Draft a post',
    description: 'Write a rule-checked Reddit post draft for the user to review, edit and post themselves. Saved to Drafts in the app. Never use this for replies to threads.',
    inputSchema: {
      project: projectArg,
      subreddit: z.string(),
      angle: z.enum(ANGLES).describe('story, lesson, question, or showcase ("I built this", always promo)'),
      mentions_product: z.boolean(),
      topic: z.string().optional().describe('e.g. a pain point title'),
    },
  }, run(async (a: { project?: string, subreddit: string, angle: typeof ANGLES[number], mentions_product: boolean, topic?: string }) => {
    const p = await project(a.project)
    const draft = await createDraft(ctx.db, ctx.env, { userId: ctx.userId, orgId: ctx.orgId, project: p }, {
      subreddit: a.subreddit,
      angle: a.angle,
      promo: a.mentions_product,
      topic: a.topic ?? null,
      generate: true,
    })
    return { id: draft.id, subreddit: draft.subreddit, title: draft.title, body: draft.body, check: draft.check }
  }))

  return server
}
