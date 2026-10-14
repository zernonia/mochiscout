<script setup lang="ts">
import { CheckIcon, CopyIcon, ExternalLinkIcon, MessageCircleReplyIcon, SparklesIcon } from '@lucide/vue'
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

async function draft() {
  drafting.value = true
  try {
    const res = await $fetch<{ followUp: string }>(`${path.value}/draft`, { method: 'POST' })
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
  window.open(props.response.url, '_blank', 'noopener')
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
    </div>
    <blockquote class="rounded-xl border-l-2 border-sky-400/60 bg-background/70 px-3 py-2 text-sm whitespace-pre-line text-pretty">{{ response.body }}</blockquote>

    <div v-if="followUp" class="flex flex-col gap-2">
      <label :for="`follow-${response.id}`" class="flex items-center gap-1.5 text-xs font-medium text-brand-foreground"><SparklesIcon class="size-3.5" /> Your answer · edit before posting</label>
      <Textarea :id="`follow-${response.id}`" v-model="followUp" rows="3" class="text-sm" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button v-if="!followUp" size="sm" class="bg-brand text-white hover:bg-brand/90" :loading="drafting" @click="draft">
        <MessageCircleReplyIcon /> Draft an answer
      </Button>
      <template v-else>
        <Button size="sm" class="bg-brand text-white hover:bg-brand/90" @click="copyAndOpen">
          <CheckIcon v-if="copied" /><CopyIcon v-else /> Copy & open reply
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
