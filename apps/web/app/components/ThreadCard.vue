<script setup lang="ts">
import { BookmarkIcon, CheckIcon, ChevronDownIcon, CircleAlertIcon, CircleHelpIcon, CopyIcon, ExternalLinkIcon, FlameIcon, LinkIcon, LockIcon, MessageSquareIcon, RefreshCwIcon, RotateCcwIcon, SparklesIcon, TrendingUpIcon, XIcon } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from '@/lib/toast'

type Status = 'new' | 'saved' | 'replied' | 'dismissed'
type ThreadState = 'open' | 'archived' | 'locked' | 'removed' | 'deleted'
type DismissReason = 'off_topic' | 'not_buyer' | 'already_answered' | 'closed' | 'other'

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
    state?: ThreadState
    hot?: boolean
    ageHours?: number | null
    commentCount?: number | null
    competitorMentions?: string[]
    dismissReason?: DismissReason | null
    replyUrl?: string | null
    replyStatus?: 'live' | 'removed' | 'unknown' | null
  }
  status?: Status
}>()
const emit = defineEmits<{ status: [Status, DismissReason?] }>()

// Drafting re-checks the thread; it may turn out archived or removed since the list loaded.
const state = ref<ThreadState>(props.thread.state ?? 'open')
watch(() => props.thread.state, (next) => { if (next) state.value = next })
const closed = computed(() => state.value !== 'open')
const closedLabel: Record<ThreadState, string> = {
  open: '',
  archived: 'Archived · can\'t reply',
  locked: 'Locked · can\'t reply',
  removed: 'Removed',
  deleted: 'Deleted by author',
}

const dismissReasons: { value: DismissReason, label: string }[] = [
  { value: 'off_topic', label: 'Not relevant' },
  { value: 'not_buyer', label: 'Not my audience' },
  { value: 'already_answered', label: 'Already answered' },
  { value: 'other', label: 'Other reason' },
]
const reasonLabel: Record<DismissReason, string> = {
  off_topic: 'Not relevant',
  not_buyer: 'Not my audience',
  already_answered: 'Already answered',
  closed: 'Closed to replies',
  other: 'Other',
}

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
    const closedState = (error as { data?: { data?: { state?: ThreadState } } })?.data?.data?.state
    if (closedState) {
      state.value = closedState
      toast.error(apiErrorMessage(error, 'This thread no longer accepts replies.'))
    }
    else if (!isPlanLimit(error)) {
      toast.error(apiErrorMessage(error, 'Could not draft a reply'))
    }
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

// Tracking link: the project's own URL with ?ref=ms_<code>, counted by the script on their site.
const copyingLink = ref(false)
async function copyTrackingLink() {
  copyingLink.value = true
  try {
    const { link } = await $fetch<{ link: string }>(`${threadPath.value}/ref`, { method: 'POST' })
    await navigator.clipboard.writeText(link)
    toast.success('Tracking link copied. Only add it where the community allows links.')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not copy the link'))
  }
  finally {
    copyingLink.value = false
  }
}

// After replying: the link to the posted reply, so we can check it stays up.
const replyUrl = ref(props.thread.replyUrl ?? '')
const savedReplyUrl = ref(props.thread.replyUrl ?? '')
const savingReplyUrl = ref(false)
async function saveReplyUrl() {
  savingReplyUrl.value = true
  try {
    await $fetch(threadPath.value, { method: 'PATCH', body: { replyUrl: replyUrl.value.trim() || null } })
    savedReplyUrl.value = replyUrl.value.trim()
    toast.success(savedReplyUrl.value ? 'We\'ll check every 12 hours that your reply stays up.' : 'Reply link removed.')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not save the link'))
  }
  finally {
    savingReplyUrl.value = false
  }
}
const replyStatusInfo = {
  live: { label: 'Your reply is live', class: 'text-emerald-700 dark:text-emerald-400', icon: CheckIcon },
  removed: { label: 'Your reply was removed', class: 'text-red-700 dark:text-red-400', icon: CircleAlertIcon },
  unknown: { label: 'Checking your reply', class: 'text-muted-foreground', icon: CircleHelpIcon },
} as const

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
  <article class="flex gap-4 rounded-xl border bg-card p-4 shadow-xs/5 transition-opacity sm:p-5" :class="closed && status === 'new' && 'opacity-70'">
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
        <span v-if="thread.commentCount != null" class="inline-flex items-center gap-1"><MessageSquareIcon class="size-3" /> {{ thread.commentCount }}</span>
        <span v-if="thread.hot && !closed" class="inline-flex items-center gap-1 rounded-full bg-orange-500/12 px-2 py-0.5 font-medium text-orange-700 dark:text-orange-400"><FlameIcon class="size-3" /> Hot · reply now</span>
        <span v-if="closed" class="inline-flex items-center gap-1 rounded-full bg-neutral-500/12 px-2 py-0.5 font-medium text-neutral-700 dark:text-neutral-300"><LockIcon class="size-3" /> {{ closedLabel[state] }}</span>
        <span v-if="status === 'dismissed' && thread.dismissReason" class="rounded-full border px-2 py-0.5">{{ reasonLabel[thread.dismissReason] }}</span>
        <span v-if="thread.searchRankFlag" class="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400"><TrendingUpIcon class="size-3" /> Ranks in Google</span>
      </div>

      <a :href="thread.url" target="_blank" rel="noopener" class="text-[15px] leading-snug font-medium text-pretty hover:underline">{{ thread.title }}</a>
      <p v-if="thread.snippet" class="line-clamp-3 text-sm text-muted-foreground">{{ thread.snippet }}</p>
      <p v-if="thread.competitorMentions?.length && !closed" class="text-xs text-muted-foreground">
        Already suggested in the replies: <span class="font-medium text-foreground">{{ thread.competitorMentions.join(', ') }}</span>. Your draft will say how you differ.
      </p>

      <div v-if="(thread.reason || thread.replyAngle) && !closed" class="grid gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-sm sm:grid-cols-2">
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

      <!-- Replied: track the posted reply -->
      <form v-if="status === 'replied'" class="flex flex-col gap-2 rounded-lg border border-dashed p-3" @submit.prevent="saveReplyUrl">
        <div v-if="savedReplyUrl" class="flex items-center gap-1.5 text-xs font-medium" :class="replyStatusInfo[thread.replyStatus ?? 'unknown'].class">
          <component :is="replyStatusInfo[thread.replyStatus ?? 'unknown'].icon" class="size-3.5" /> {{ replyStatusInfo[thread.replyStatus ?? 'unknown'].label }}
        </div>
        <Label v-else :for="`reply-url-${thread.id}`" class="text-xs font-normal text-muted-foreground">Paste the link to your reply and we'll check it stays up</Label>
        <div class="flex gap-2">
          <Input :id="`reply-url-${thread.id}`" v-model="replyUrl" placeholder="https://www.reddit.com/r/…/comments/…/…/abc123/" class="h-8 flex-1 text-sm" />
          <Button type="submit" size="sm" variant="outline" :loading="savingReplyUrl" :disabled="replyUrl.trim() === savedReplyUrl">Save</Button>
        </div>
      </form>

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="closed">
          <Button v-if="status !== 'dismissed'" size="sm" variant="outline" @click="emit('status', 'dismissed', 'closed')"><XIcon /> Dismiss, can't reply</Button>
          <Button as-child size="sm" variant="ghost">
            <a :href="thread.url" target="_blank" rel="noopener"><ExternalLinkIcon /> Open thread</a>
          </Button>
        </template>
        <template v-else-if="reply && !drafting">
          <Button size="sm" @click="copyAndOpen">
            <CheckIcon v-if="copied" /><CopyIcon v-else /> {{ copied ? 'Copied, opening thread' : 'Copy & open thread' }}
          </Button>
          <Button size="sm" variant="outline" :loading="copyingLink" @click="copyTrackingLink"><LinkIcon /> Copy tracking link</Button>
        </template>
        <template v-else>
          <Button v-if="status !== 'replied'" size="sm" :loading="drafting" @click="draftReply"><SparklesIcon /> Draft reply</Button>
          <Button as-child size="sm" variant="outline">
            <a :href="thread.url" target="_blank" rel="noopener"><ExternalLinkIcon /> Open thread</a>
          </Button>
        </template>
        <Button
          v-for="a in actions.filter(a => a.status !== (status ?? 'new') && !(closed && a.status === 'replied'))"
          :key="a.status"
          size="sm"
          variant="ghost"
          @click="emit('status', a.status)"
        >
          <component :is="a.icon" /> {{ a.label }}
        </Button>
        <!-- The reason teaches the scorer what isn't a fit. -->
        <Menu v-if="status !== 'dismissed' && !closed">
          <MenuTrigger as-child>
            <Button size="sm" variant="ghost"><XIcon /> Dismiss <ChevronDownIcon class="-ms-0.5 opacity-60" /></Button>
          </MenuTrigger>
          <MenuPopup align="start" class="min-w-48">
            <MenuGroupLabel>Why? It improves your scores</MenuGroupLabel>
            <MenuItem v-for="r in dismissReasons" :key="r.value" @select="emit('status', 'dismissed', r.value)">{{ r.label }}</MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    </div>
  </article>
</template>
