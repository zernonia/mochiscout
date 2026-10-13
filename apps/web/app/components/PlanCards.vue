<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'

defineProps<{
  plans: {
    id: 'free' | 'solo' | 'pro'
    label: string
    price: number | null
    projects: number | null
    watchedSubreddits: number | null
    seats: number | null
    digest: string
    researchEveryDays: number | null
    mcp: boolean
    autoReplies?: boolean
    hotAlerts?: boolean
    draftsPerMonth?: number | null
    sources: string[]
  }[]
  current?: string
  highlight?: string
}>()

const sourceLabel: Record<string, string> = { reddit: 'Reddit', hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web' }

function features(p: { projects: number | null, watchedSubreddits: number | null, seats: number | null, digest: string, researchEveryDays: number | null, mcp: boolean, autoReplies?: boolean, hotAlerts?: boolean, draftsPerMonth?: number | null, sources: string[] }) {
  return [
    `${p.projects} project${p.projects === 1 ? '' : 's'}`,
    `${p.watchedSubreddits} watched subreddits`,
    p.seats && p.seats > 1 ? `${p.seats} team seats` : '1 seat',
    `${p.digest === 'daily' ? 'Daily' : 'Weekly'} digest`,
    `${p.draftsPerMonth ? p.draftsPerMonth.toLocaleString('en-US') : 'Unlimited'} AI drafts a month${p.autoReplies ? ', automatic for hot leads' : ''}`,
    ...(p.hotAlerts ? ['Hot lead email alerts'] : []),
    p.researchEveryDays ? `Pain-point research every ${p.researchEveryDays === 7 ? 'week' : 'month'}` : 'Pain-point research on demand',
    p.sources.map(s => sourceLabel[s] ?? s).join(', '),
    ...(p.mcp ? ['MCP server for AI agents'] : []),
  ]
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <div
      v-for="p in plans"
      :key="p.id"
      class="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs/5"
      :class="highlight === p.id ? 'border-brand/40 bg-gradient-to-b from-brand-soft/50 to-card ring-4 ring-brand/10' : current === p.id ? 'border-brand/25' : ''"
    >
      <div>
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold">{{ p.label }}</h3>
          <span v-if="current === p.id" class="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-foreground">Current</span>
        </div>
        <div class="mt-1 text-3xl font-semibold tabular-nums">${{ p.price }}<span class="text-sm font-normal text-muted-foreground">/mo</span></div>
      </div>
      <ul class="flex flex-1 flex-col gap-2 text-sm">
        <li v-for="f in features(p)" :key="f" class="flex gap-2">
          <span class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-foreground" aria-hidden="true"><CheckIcon class="size-3" :stroke-width="3" /></span>{{ f }}
        </li>
      </ul>
      <slot name="action" :plan="p" />
    </div>
  </div>
</template>
