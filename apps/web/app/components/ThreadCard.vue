<script setup lang="ts">
import { BookmarkIcon, CheckIcon, ExternalLinkIcon, RotateCcwIcon, TrendingUpIcon, XIcon } from '@lucide/vue'

type Status = 'new' | 'saved' | 'replied' | 'dismissed'

defineProps<{
  thread: {
    id: string
    platform?: string
    channel: string | null
    title: string
    url: string
    snippet: string | null
    createdUtc: string | Date | null
    intent: number
    kind: string
    reason: string | null
    replyAngle: string | null
    searchRankFlag?: boolean
  }
  status?: Status
}>()
const emit = defineEmits<{ status: [Status] }>()

const kinds: Record<string, { label: string, dot: string }> = {
  seeking_tool: { label: 'Looking for a tool', dot: 'bg-emerald-500' },
  comparison: { label: 'Comparing options', dot: 'bg-sky-500' },
  complaint: { label: 'Complaint', dot: 'bg-orange-500' },
  pain: { label: 'Pain point', dot: 'bg-amber-500' },
  other: { label: 'Other', dot: 'bg-neutral-400' },
}

const platformLabel: Record<string, string> = { reddit: 'Reddit', hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web' }

const actions = [
  { status: 'replied' as const, label: 'Replied', icon: CheckIcon },
  { status: 'saved' as const, label: 'Save', icon: BookmarkIcon },
  { status: 'dismissed' as const, label: 'Dismiss', icon: XIcon },
  { status: 'new' as const, label: 'Back to new', icon: RotateCcwIcon },
]

function age(date: string | Date | null) {
  if (!date) return null
  const hours = Math.round((Date.now() - new Date(date).getTime()) / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
</script>

<template>
  <article class="flex gap-4 rounded-xl border bg-card p-4 shadow-xs/5 sm:p-5">
    <IntentScore :value="thread.intent" class="hidden sm:flex" />
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
        <IntentScore :value="thread.intent" class="size-9 sm:hidden" />
        <span class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium text-foreground">
          <span class="size-1.5 rounded-full" :class="(kinds[thread.kind] ?? kinds.other!).dot" />
          {{ (kinds[thread.kind] ?? kinds.other!).label }}
        </span>
        <span class="font-medium text-foreground">{{ thread.channel ? `r/${thread.channel}` : platformLabel[thread.platform ?? ''] ?? '' }}</span>
        <span v-if="age(thread.createdUtc)">{{ age(thread.createdUtc) }}</span>
        <span v-if="thread.searchRankFlag" class="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400"><TrendingUpIcon class="size-3" /> Ranks in Google</span>
      </div>

      <a :href="thread.url" target="_blank" rel="noopener" class="text-[15px] leading-snug font-medium text-pretty hover:underline">{{ thread.title }}</a>
      <p v-if="thread.snippet" class="line-clamp-3 text-sm text-muted-foreground">{{ thread.snippet }}</p>

      <div v-if="thread.reason || thread.replyAngle" class="grid gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-sm sm:grid-cols-2">
        <div v-if="thread.reason">
          <div class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Why it matters</div>
          <p class="mt-0.5">{{ thread.reason }}</p>
        </div>
        <div v-if="thread.replyAngle">
          <div class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Reply angle</div>
          <p class="mt-0.5">{{ thread.replyAngle }}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button as-child size="sm">
          <a :href="thread.url" target="_blank" rel="noopener"><ExternalLinkIcon /> Open thread</a>
        </Button>
        <Button
          v-for="a in actions.filter(a => a.status !== (status ?? 'new'))"
          :key="a.status"
          size="sm"
          variant="ghost"
          @click="emit('status', a.status)"
        >
          <component :is="a.icon" /> {{ a.label }}
        </Button>
      </div>
    </div>
  </article>
</template>
