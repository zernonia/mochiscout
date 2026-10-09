<script setup lang="ts">
import { BookmarkIcon, CheckIcon, CopyIcon, ExternalLinkIcon, RefreshCwIcon, RotateCcwIcon, SparklesIcon, TrendingUpIcon, XIcon } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from '@/lib/toast'

type Status = 'new' | 'saved' | 'replied' | 'dismissed'

const props = defineProps<{
  projectId: string
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
    replyDraft?: string | null
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

// --- AI reply draft: drafted on demand (or by the auto-draft job), edited here, posted by the user.
const reply = ref(props.thread.replyDraft ?? '')
const drafting = ref(false)
const copied = ref(false)
watch(() => props.thread.replyDraft, (next) => { if (next != null && !drafting.value) reply.value = next })

const threadPath = computed(() => `/api/projects/${props.projectId}/threads/${encodeURIComponent(props.thread.id)}`)

async function draftReply() {
  drafting.value = true
  try {
    const res = await $fetch<{ replyDraft: string }>(`${threadPath.value}/reply`, { method: 'POST' })
    reply.value = res.replyDraft
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not draft a reply'))
  }
  finally {
    drafting.value = false
  }
}

const saveEdits = useDebounceFn(async (text: string) => {
  try {
    await $fetch(threadPath.value, { method: 'PATCH', body: { replyDraft: text } })
  }
  catch {
    toast.error('Could not save your edits')
  }
}, 800)
function onEdit(text: string) {
  reply.value = text
  saveEdits(text)
}

async function copyAndOpen() {
  try {
    await navigator.clipboard.writeText(reply.value)
    copied.value = true
  }
  catch {
    toast.error('Could not copy. Select the text and copy it yourself.')
  }
  window.open(props.thread.url, '_blank', 'noopener')
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

      <!-- Reply -->
      <div v-if="drafting" class="flex flex-col gap-2 rounded-lg border p-3" aria-live="polite">
        <div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><SparklesIcon class="size-3.5 animate-pulse" /> Drafting a reply…</div>
        <Skeleton class="h-3.5 w-full" /><Skeleton class="h-3.5 w-11/12" /><Skeleton class="h-3.5 w-3/5" />
      </div>
      <div v-else-if="reply" class="flex flex-col gap-2 rounded-lg border border-violet-500/25 bg-violet-500/[0.03] p-3">
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-400"><SparklesIcon class="size-3.5" /> Your reply · AI draft, edit before posting</span>
          <Button size="xs" variant="ghost" :disabled="drafting" @click="draftReply"><RefreshCwIcon /> Redraft</Button>
        </div>
        <Textarea :model-value="reply" rows="5" class="bg-background text-sm" aria-label="Reply draft" @update:model-value="(v: string | number) => onEdit(String(v))" />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="reply && !drafting">
          <Button size="sm" @click="copyAndOpen">
            <CheckIcon v-if="copied" /><CopyIcon v-else /> {{ copied ? 'Copied, opening thread' : 'Copy & open thread' }}
          </Button>
        </template>
        <template v-else>
          <Button size="sm" :loading="drafting" @click="draftReply"><SparklesIcon /> Draft reply</Button>
          <Button as-child size="sm" variant="outline">
            <a :href="thread.url" target="_blank" rel="noopener"><ExternalLinkIcon /> Open thread</a>
          </Button>
        </template>
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
