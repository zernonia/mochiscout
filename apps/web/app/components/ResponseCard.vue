<script setup lang="ts">
import { CheckIcon, CopyIcon, ExternalLinkIcon, MailIcon, MessageCircleReplyIcon, SparklesIcon } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from '@/lib/toast'

/** Someone answered a reply the founder posted: draft a follow-up, open it, or mark it done. */
const props = defineProps<{
  projectId: string
  response: {
    id: string
    author: string | null
    body: string
    url: string
    postedAt: string | Date | null
    foundAt: string | Date
    followUp: string | null
    threadTitle: string
    channel: string | null
    platform: string
    /** They asked to be messaged privately ("can you DM me the link?"). */
    asksForDm?: boolean
  }
}>()
const emit = defineEmits<{ done: [] }>()

const path = computed(() => `/api/projects/${props.projectId}/responses/${encodeURIComponent(props.response.id)}`)
const followUp = ref(props.response.followUp ?? '')
let saved = followUp.value
const drafting = ref(false)
const copied = ref(false)

const who = computed(() => {
  const a = props.response.author
  if (!a) return 'Someone'
  return props.response.platform === 'reddit' ? `u/${a}` : props.response.platform === 'bluesky' ? `@${a}` : a
})
const where = computed(() => props.response.channel ? `r/${props.response.channel}` : ({ hn: 'Hacker News', bluesky: 'Bluesky', x: 'X' } as Record<string, string>)[props.response.platform] ?? props.response.platform)
const age = computed(() => {
  const d = props.response.postedAt ?? props.response.foundAt
  const hours = Math.round((Date.now() - new Date(d).getTime()) / 3_600_000)
  return hours < 1 ? 'just now' : hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
})

// They asked for a DM: draft a private message and send it from the messages page.
const asDm = computed(() => !!props.response.asksForDm)
const dmLink = computed(() => {
  const a = props.response.author
  if (props.response.platform === 'reddit' && a && /^[\w-]{3,20}$/.test(a)) return `https://www.reddit.com/message/compose/?to=${a}`
  if (props.response.platform === 'bluesky' && a && /^[\w.:-]+$/.test(a)) return `https://bsky.app/profile/${a}`
  return props.response.url
})

const long = computed(() => props.response.body.length > 320)
const expanded = ref(false)

async function draft() {
  drafting.value = true
  try {
    const res = await $fetch<{ followUp: string }>(`${path.value}/draft`, { method: 'POST', body: { dm: asDm.value } })
    saved = res.followUp
    followUp.value = res.followUp
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not draft a response'))
  }
  finally {
    drafting.value = false
  }
}

// The founder's edits are kept, so a draft isn't lost when they come back later.
const saveEdit = useDebounceFn((text: string) => {
  saved = text
  return $fetch(path.value, { method: 'PATCH', body: { followUp: text } }).catch(() => {})
}, 800)
watch(followUp, (text) => { if (text !== saved) saveEdit(text) })

async function copyAndOpen() {
  try {
    await navigator.clipboard.writeText(followUp.value)
    copied.value = true
  }
  catch {
    toast.error('Could not copy. Select the text and copy it yourself.')
  }
  window.open(asDm.value ? dmLink.value : props.response.url, '_blank', 'noopener')
}
</script>

<template>
  <article class="flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-50/80 via-card to-card p-4 shadow-xs/5 sm:p-5">
    <div class="flex items-start gap-3">
      <SourceAvatar :channel="response.channel" :platform="response.platform" size="md" />
      <div class="min-w-0 flex-1">
        <p class="text-sm">
          <span class="font-medium">{{ who }}</span>
          <span class="text-muted-foreground"> replied to your comment in {{ where }} · {{ age }}</span>
        </p>
        <p class="truncate text-xs text-muted-foreground">On "{{ response.threadTitle }}"</p>
      </div>
      <span v-if="asDm" class="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"><MailIcon class="size-3" /> Asked for a DM</span>
    </div>
    <div class="rounded-2xl rounded-tl-md border bg-background px-3.5 py-2.5 text-sm">
      <p class="whitespace-pre-line text-pretty" :class="long && !expanded && 'line-clamp-4'">{{ response.body }}</p>
      <button v-if="long" type="button" class="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground" @click="expanded = !expanded">{{ expanded ? 'Show less' : 'Show more' }}</button>
    </div>

    <div v-if="followUp" class="flex flex-col gap-2">
      <label :for="`follow-${response.id}`" class="flex items-center gap-1.5 text-xs font-medium text-brand-foreground"><SparklesIcon class="size-3.5" /> {{ asDm ? 'Your message' : 'Your answer' }} · edit before {{ asDm ? 'sending' : 'posting' }}</label>
      <Textarea :id="`follow-${response.id}`" v-model="followUp" rows="3" class="text-sm" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button v-if="!followUp" size="sm" class="bg-brand text-white hover:bg-brand/90" :loading="drafting" @click="draft">
        <MailIcon v-if="asDm" /><MessageCircleReplyIcon v-else /> {{ asDm ? 'Draft a DM' : 'Draft an answer' }}
      </Button>
      <template v-else>
        <Button size="sm" class="bg-brand text-white hover:bg-brand/90" @click="copyAndOpen">
          <CheckIcon v-if="copied" /><CopyIcon v-else /> {{ asDm ? 'Copy & open messages' : 'Copy & open reply' }}
        </Button>
        <Button size="sm" variant="outline" :loading="drafting" @click="draft">Redraft</Button>
      </template>
      <Button v-if="!followUp" as-child size="sm" variant="outline">
        <a :href="response.url" target="_blank" rel="noopener"><ExternalLinkIcon /> Open</a>
      </Button>
      <Button size="sm" variant="ghost" @click="emit('done')"><CheckIcon /> Done</Button>
    </div>
  </article>
</template>
