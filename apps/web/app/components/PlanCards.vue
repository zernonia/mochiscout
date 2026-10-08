<script setup lang="ts">
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
    sources: string[]
  }[]
  current?: string
  highlight?: string
}>()

const sourceLabel: Record<string, string> = { reddit: 'Reddit', hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web' }

function features(p: { projects: number | null, watchedSubreddits: number | null, seats: number | null, digest: string, researchEveryDays: number | null, mcp: boolean, sources: string[] }) {
  return [
    `${p.projects} project${p.projects === 1 ? '' : 's'}`,
    `${p.watchedSubreddits} watched subreddits`,
    p.seats && p.seats > 1 ? `${p.seats} team seats` : '1 seat',
    `${p.digest === 'daily' ? 'Daily' : 'Weekly'} digest`,
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
      class="flex flex-col gap-4 rounded-xl border p-5"
      :class="highlight === p.id ? 'border-foreground ring-1 ring-foreground' : ''"
    >
      <div>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ p.label }}</h3>
          <Badge v-if="current === p.id" variant="secondary">Current</Badge>
        </div>
        <div class="mt-1 text-3xl font-semibold tabular-nums">${{ p.price }}<span class="text-sm font-normal text-muted-foreground">/mo</span></div>
      </div>
      <ul class="flex flex-1 flex-col gap-1.5 text-sm">
        <li v-for="f in features(p)" :key="f" class="flex gap-2"><span aria-hidden="true">✓</span>{{ f }}</li>
      </ul>
      <slot name="action" :plan="p" />
    </div>
  </div>
</template>
