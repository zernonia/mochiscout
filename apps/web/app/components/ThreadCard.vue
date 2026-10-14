<script setup lang="ts">
import { BookmarkIcon, CheckIcon, ChevronDownIcon, CircleAlertIcon, CircleHelpIcon, CopyIcon, ExternalLinkIcon, FlameIcon, LightbulbIcon, LinkIcon, LockIcon, MailIcon, MessageSquareIcon, RefreshCwIcon, RotateCcwIcon, SparklesIcon, TargetIcon, TrendingUpIcon, UsersIcon, XIcon } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from '@/lib/toast'

type Status = 'new' | 'saved' | 'replied' | 'dismissed'
type ThreadState = 'open' | 'archived' | 'locked' | 'removed' | 'deleted'
type DismissReason = 'off_topic' | 'not_buyer' | 'self_promo' | 'already_answered' | 'closed' | 'other'

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
    author?: string | null
    /** Commenters who want the same thing. */
    alsoAsking?: { author: string | null, text: string, url?: string }[]
    /** The author invited private messages, and the community doesn't discourage them. */
    openToDms?: boolean
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
  { value: 'self_promo', label: 'Self-promotion' },
  { value: 'already_answered', label: 'Already answered' },
  { value: 'other', label: 'Other reason' },
]
const reasonLabel: Record<DismissReason, string> = {
  off_topic: 'Not relevant',
  not_buyer: 'Not my audience',
  self_promo: 'Self-promotion',
  already_answered: 'Already answered',
  closed: 'Closed to replies',
  other: 'Other',
}

const kinds: Record<string, { label: string, dot: string, chip: string }> = {
  seeking_tool: { label: 'Looking for a tool', dot: 'bg-brand', chip: 'bg-brand-soft text-brand-foreground' },
  comparison: { label: 'Comparing options', dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-800 dark:text-sky-300' },
  complaint: { label: 'Complaint', dot: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-800 dark:text-orange-300' },
  pain: { label: 'Pain point', dot: 'bg-amber-500', chip: 'bg-amber-500/12 text-amber-800 dark:text-amber-300' },
  other: { label: 'Other', dot: 'bg-neutral-400', chip: 'bg-muted text-muted-foreground' },
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

// Direction for a (re)draft: an angle, a detail to include, a tone. Kept after drafting so it can be tweaked.
const directing = ref(false)
const direction = ref('')
const directionInput = useTemplateRef<{ $el?: HTMLElement }>('directionInput')
const directionChips = ['Shorter', 'More casual', 'Share a personal experience', 'Leave the product out', 'Mention the product', 'End with a question']
const hasChip = (chip: string) => direction.value.toLowerCase().includes(chip.toLowerCase())
function toggleChip(chip: string) {
  if (hasChip(chip)) {
    const at = direction.value.toLowerCase().indexOf(chip.toLowerCase())
    direction.value = `${direction.value.slice(0, at)}${direction.value.slice(at + chip.length).replace(/^\./, '')}`.replace(/\s{2,}/g, ' ').trim()
  }
  else {
    const text = direction.value.trim()
    direction.value = text ? `${text}${/[.!?]$/.test(text) ? '' : '.'} ${chip}.` : `${chip}.`
  }
}
function openDirection() {
  directing.value = true
  nextTick(() => {
    const el = directionInput.value?.$el
    const box = el instanceof HTMLTextAreaElement ? el : el?.querySelector?.('textarea')
    box?.focus()
  })
}

// --- A private message, only when the author invited one. Not stored: copied and sent by the founder.
const dm = ref('')
const draftingDm = ref(false)
const dmCopied = ref(false)
async function draftDm() {
  draftingDm.value = true
  try {
    const res = await $fetch<{ dm: string }>(`${threadPath.value}/dm`, { method: 'POST' })
    dm.value = res.dm
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not draft a message'))
  }
  finally {
    draftingDm.value = false
  }
}
const handle = (name: string | null) => !name ? 'Someone' : props.thread.platform === 'reddit' ? `u/${name}` : props.thread.platform === 'hn' ? name : `@${name}`
// Where to send it: Reddit's compose page for the author; their profile elsewhere.
const dmLink = computed(() => {
  const a = props.thread.author
  if (!a) return props.thread.url
  if (props.thread.platform === 'reddit') return /^[\w-]{3,20}$/.test(a) ? `https://www.reddit.com/message/compose/?to=${a}` : props.thread.url
  if (props.thread.platform === 'bluesky') return /^[\w.:-]+$/.test(a) ? `https://bsky.app/profile/${a}` : props.thread.url
  if (props.thread.platform === 'x') return /^\w{1,15}$/.test(a) ? `https://x.com/${a}` : props.thread.url
  return props.thread.url
})
async function copyDmAndOpen() {
  try {
    await navigator.clipboard.writeText(dm.value)
    dmCopied.value = true
  }
  catch {
    toast.error('Could not copy. Select the text and copy it yourself.')
  }
  window.open(dmLink.value, '_blank', 'noopener')
}

async function draftReply() {
  const guided = directing.value && direction.value.trim()
  drafting.value = true
  try {
    const body = guided ? { direction: direction.value.trim(), current: reply.value.trim() || undefined } : undefined
    const res = await $fetch<{ replyDraft: string }>(`${threadPath.value}/reply`, { method: 'POST', body })
    reply.value = res.replyDraft
    directing.value = false
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
    toast.success(savedReplyUrl.value ? 'We\'ll tell you when someone replies, and check that your reply stays up.' : 'Reply link removed.')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not save the link'))
  }
  finally {
    savingReplyUrl.value = false
  }
}
// Right after copying, ask for the posted link and mark it replied in one step, so reply-watch starts.
const markingPosted = ref(false)
async function markPosted() {
  markingPosted.value = true
  try {
    if (replyUrl.value.trim()) {
      await $fetch(threadPath.value, { method: 'PATCH', body: { replyUrl: replyUrl.value.trim() } })
      savedReplyUrl.value = replyUrl.value.trim()
      toast.success('We\'ll tell you when someone answers, and check that your reply stays up.')
    }
    emit('status', 'replied')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not save the link'))
  }
  finally {
    markingPosted.value = false
  }
}
const replyStatusInfo = {
  live: { label: 'Your reply is live', class: 'text-emerald-700 dark:text-emerald-400', icon: CheckIcon },
  removed: { label: 'Your reply was removed', class: 'text-red-700 dark:text-red-400', icon: CircleAlertIcon },
  unknown: { label: 'Checking your reply', class: 'text-muted-foreground', icon: CircleHelpIcon },
} as const

async function copyAndOpen() {
  trackClient('reply_copied', { project_id: props.projectId, platform: props.thread.platform })
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
  <article
    class="relative flex gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 transition-[opacity,box-shadow] hover:shadow-sm sm:p-5"
    :class="[closed && status === 'new' && 'opacity-70', thread.hot && !closed && 'border-brand/25 bg-gradient-to-br from-brand-soft/70 via-card to-card']"
  >
    <IntentScore :value="thread.intent" class="hidden sm:flex" />
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
        <IntentScore :value="thread.intent" class="size-9 sm:hidden" />
        <span class="inline-flex items-center gap-1.5 font-medium text-foreground">
          <SourceAvatar :channel="thread.channel" :platform="thread.platform" size="sm" />
          {{ thread.channel ? `r/${thread.channel}` : platformLabel[thread.platform ?? ''] ?? '' }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium" :class="(kinds[thread.kind] ?? kinds.other!).chip">
          <span class="size-1.5 rounded-full" :class="(kinds[thread.kind] ?? kinds.other!).dot" />
          {{ (kinds[thread.kind] ?? kinds.other!).label }}
        </span>
        <span v-if="age(thread.createdUtc)">{{ age(thread.createdUtc) }}</span>
        <span v-if="thread.commentCount != null" class="inline-flex items-center gap-1"><MessageSquareIcon class="size-3" /> {{ thread.commentCount }}</span>
        <span v-if="thread.hot && !closed" class="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 font-medium text-primary-foreground"><FlameIcon class="size-3" /> Hot · reply now</span>
        <span v-if="closed" class="inline-flex items-center gap-1 rounded-full bg-neutral-500/12 px-2 py-0.5 font-medium text-neutral-700 dark:text-neutral-300"><LockIcon class="size-3" /> {{ closedLabel[state] }}</span>
        <span v-if="status === 'dismissed' && thread.dismissReason" class="rounded-full border px-2 py-0.5">{{ reasonLabel[thread.dismissReason] }}</span>
        <span v-if="thread.searchRankFlag" class="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400"><TrendingUpIcon class="size-3" /> Ranks in Google</span>
        <span v-if="thread.openToDms && !closed" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400" title="The author asked people to message them"><MailIcon class="size-3" /> Open to DMs</span>
      </div>

      <a :href="thread.url" target="_blank" rel="noopener" class="text-[15px] leading-snug font-medium text-pretty hover:underline">{{ thread.title }}</a>
      <p v-if="thread.snippet" class="line-clamp-3 text-sm text-muted-foreground">{{ thread.snippet }}</p>
      <p v-if="thread.competitorMentions?.length && !closed" class="text-xs text-muted-foreground">
        Already suggested in the replies: <span class="font-medium text-foreground">{{ thread.competitorMentions.join(', ') }}</span>. Your draft will say how you differ.
      </p>

      <div v-if="thread.alsoAsking?.length && !closed" class="flex flex-col gap-2 rounded-xl border border-dashed p-3 text-sm">
        <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <UsersIcon class="size-3.5" /> {{ thread.alsoAsking.length }} {{ thread.alsoAsking.length === 1 ? 'other person wants' : 'others want' }} this too. Reply to them as well.
        </p>
        <div v-for="c in thread.alsoAsking" :key="`${c.author}-${c.text}`" class="flex min-w-0 items-baseline gap-2">
          <span class="shrink-0 font-medium">{{ handle(c.author) }}</span>
          <span class="min-w-0 flex-1 truncate text-muted-foreground">{{ c.text }}</span>
          <a :href="c.url ?? thread.url" target="_blank" rel="noopener" class="shrink-0 text-xs font-medium text-brand-foreground hover:underline">Reply</a>
        </div>
      </div>

      <div v-if="(thread.reason || thread.replyAngle) && !closed" class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div v-if="thread.reason" class="flex gap-2.5 rounded-xl bg-muted/70 p-3">
          <TargetIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <div class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Why it matters</div>
            <p class="mt-0.5 text-pretty">{{ thread.reason }}</p>
          </div>
        </div>
        <div v-if="thread.replyAngle" class="flex gap-2.5 rounded-xl bg-brand-soft/70 p-3">
          <LightbulbIcon class="mt-0.5 size-4 shrink-0 text-brand" />
          <div>
            <div class="text-[11px] font-medium tracking-wide text-brand-foreground/80 uppercase">Reply angle</div>
            <p class="mt-0.5 text-pretty">{{ thread.replyAngle }}</p>
          </div>
        </div>
      </div>

      <!-- Reply -->
      <div v-if="drafting" class="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand-soft/30 p-3" aria-live="polite">
        <div class="flex items-center gap-1.5 text-xs font-medium text-brand-foreground"><SparklesIcon class="size-3.5 animate-pulse" /> Drafting a reply…</div>
        <Skeleton class="h-3.5 w-full" /><Skeleton class="h-3.5 w-11/12" /><Skeleton class="h-3.5 w-3/5" />
      </div>
      <div v-else-if="reply" class="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand-soft/40 p-3">
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-foreground"><SparklesIcon class="size-3.5" /> Your reply · AI draft, edit before posting</span>
          <div class="flex items-center gap-1">
            <Button as-child size="xs" variant="ghost"><NuxtLink :to="`/app/${projectId}/profile#reply-instructions`">Tune drafts</NuxtLink></Button>
            <Button size="xs" variant="ghost" :disabled="drafting" :aria-expanded="directing" @click="directing ? (directing = false) : openDirection()"><RefreshCwIcon /> Redraft</Button>
          </div>
        </div>
        <Textarea :model-value="reply" rows="5" class="bg-background text-sm" aria-label="Reply draft" @update:model-value="(v: string | number) => onEdit(String(v))" />
      </div>

      <!-- Private message, when the author invited one -->
      <div v-if="dm && !closed" class="flex flex-col gap-2 rounded-xl border border-emerald-500/25 bg-emerald-50/60 p-3 dark:bg-emerald-500/5">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300"><MailIcon class="size-3.5" /> Message to {{ handle(thread.author ?? null) }} · they asked for DMs, edit before sending</span>
        <Textarea v-model="dm" rows="4" class="bg-background text-sm" aria-label="Private message draft" />
        <div class="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" @click="copyDmAndOpen"><CheckIcon v-if="dmCopied" /><CopyIcon v-else /> {{ dmCopied ? 'Copied, opening' : 'Copy & open messages' }}</Button>
          <Button size="sm" variant="ghost" :loading="draftingDm" @click="draftDm"><RefreshCwIcon /> Redraft</Button>
        </div>
      </div>

      <!-- Steer the (re)draft -->
      <form v-if="directing && !drafting && !closed" class="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand-soft/40 p-3" @submit.prevent="draftReply" @keydown.esc="directing = false">
        <Label :for="`direction-${thread.id}`" class="text-xs font-medium">{{ reply ? 'How should the redraft change?' : 'Anything the reply should do?' }} <span class="font-normal text-muted-foreground">Optional</span></Label>
        <Textarea
          :id="`direction-${thread.id}`"
          ref="directionInput"
          v-model="direction"
          rows="2"
          maxlength="500"
          class="bg-background text-sm"
          placeholder="e.g. Say I built it for my own study sessions and that it's free. Keep it under 60 words."
          @keydown.meta.enter.prevent="draftReply"
          @keydown.ctrl.enter.prevent="draftReply"
        />
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="chip in directionChips"
            :key="chip"
            type="button"
            class="rounded-full border px-2.5 py-0.5 text-xs transition-colors"
            :class="hasChip(chip) ? 'border-brand/40 bg-brand text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'"
            :aria-pressed="hasChip(chip)"
            @click="toggleChip(chip)"
          >{{ chip }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm"><SparklesIcon /> {{ reply ? 'Redraft' : 'Draft reply' }}</Button>
          <Button type="button" size="sm" variant="ghost" @click="directing = false">Cancel</Button>
          <span v-if="reply" class="text-xs text-muted-foreground">Revises the draft above, keeping your edits unless you say otherwise.</span>
        </div>
      </form>

      <!-- Replied: track the posted reply -->
      <form v-if="status === 'replied'" class="flex flex-col gap-2 rounded-xl border border-dashed bg-muted/40 p-3" @submit.prevent="saveReplyUrl">
        <div v-if="savedReplyUrl" class="flex items-center gap-1.5 text-xs font-medium" :class="replyStatusInfo[thread.replyStatus ?? 'unknown'].class">
          <component :is="replyStatusInfo[thread.replyStatus ?? 'unknown'].icon" class="size-3.5" /> {{ replyStatusInfo[thread.replyStatus ?? 'unknown'].label }}
        </div>
        <Label v-else :for="`reply-url-${thread.id}`" class="text-xs font-normal text-muted-foreground">Paste the link to your reply: we'll tell you when someone answers, and check it stays up</Label>
        <div class="flex gap-2">
          <Input :id="`reply-url-${thread.id}`" v-model="replyUrl" placeholder="https://www.reddit.com/r/…/comments/…/…/abc123/" class="h-8 flex-1 text-sm" />
          <Button type="submit" size="sm" variant="outline" :loading="savingReplyUrl" :disabled="replyUrl.trim() === savedReplyUrl">Save</Button>
        </div>
      </form>

      <!-- Just copied: the posted link turns on reply-watch. -->
      <form v-if="copied && reply && status !== 'replied' && !closed" class="flex flex-col gap-2 rounded-xl border border-dashed border-sky-500/30 bg-sky-50/60 p-3" @submit.prevent="markPosted">
        <Label :for="`posted-url-${thread.id}`" class="text-xs font-normal text-muted-foreground">Posted it? Paste the link to your reply and we'll tell you when someone answers.</Label>
        <div class="flex gap-2">
          <Input :id="`posted-url-${thread.id}`" v-model="replyUrl" placeholder="Link to your reply (optional)" class="h-8 flex-1 bg-background text-sm" />
          <Button type="submit" size="sm" :loading="markingPosted"><CheckIcon /> Mark replied</Button>
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
          <Button v-if="thread.openToDms && !dm" size="sm" variant="outline" :loading="draftingDm" @click="draftDm"><MailIcon /> Draft a DM</Button>
        </template>
        <template v-else>
          <Button v-if="status !== 'replied'" size="sm" :loading="drafting" @click="draftReply"><SparklesIcon /> Draft reply</Button>
          <Button v-if="status !== 'replied' && !drafting && !directing" size="sm" variant="ghost" @click="openDirection">With direction…</Button>
          <Button v-if="thread.openToDms && !dm" size="sm" variant="outline" :loading="draftingDm" @click="draftDm"><MailIcon /> Draft a DM</Button>
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
