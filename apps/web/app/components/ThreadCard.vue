<script setup lang="ts">
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

const kindLabel: Record<string, string> = {
  seeking_tool: 'Looking for a tool',
  comparison: 'Comparing',
  complaint: 'Complaint',
  pain: 'Pain point',
  other: 'Other',
}

const platformLabel: Record<string, string> = { hn: 'Hacker News', bluesky: 'Bluesky', x: 'X', web: 'Web' }

const actions: { status: Status, label: string }[] = [
  { status: 'replied', label: 'Replied' },
  { status: 'saved', label: 'Save' },
  { status: 'dismissed', label: 'Dismiss' },
  { status: 'new', label: 'Back to new' },
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
  <article class="flex flex-col gap-3 rounded-xl border p-4">
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge>{{ thread.intent }}</Badge>
      <Badge variant="outline">{{ kindLabel[thread.kind] ?? thread.kind }}</Badge>
      <span v-if="thread.channel">r/{{ thread.channel }}</span>
      <span v-else-if="thread.platform && platformLabel[thread.platform]">{{ platformLabel[thread.platform] }}</span>
      <span v-if="age(thread.createdUtc)">· {{ age(thread.createdUtc) }}</span>
      <span v-if="thread.searchRankFlag">· ranks in search</span>
    </div>
    <a :href="thread.url" target="_blank" rel="noopener" class="font-medium leading-snug hover:underline">{{ thread.title }}</a>
    <p v-if="thread.snippet" class="line-clamp-3 text-sm text-muted-foreground">{{ thread.snippet }}</p>
    <div class="rounded-md bg-muted p-3 text-sm">
      <p>{{ thread.reason }}</p>
      <p class="mt-1"><span class="font-medium">Reply angle:</span> {{ thread.replyAngle }}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button as-child size="sm">
        <a :href="thread.url" target="_blank" rel="noopener">Open thread</a>
      </Button>
      <Button
        v-for="a in actions.filter(a => a.status !== (status ?? 'new'))"
        :key="a.status"
        size="sm"
        variant="outline"
        @click="emit('status', a.status)"
      >
        {{ a.label }}
      </Button>
    </div>
  </article>
</template>
