<script setup lang="ts">
import { CheckIcon, XIcon } from '@lucide/vue'

/**
 * The path to a first posted reply, shown until it's done or dismissed.
 * Each step links to where it happens.
 */
const props = defineProps<{ projectId: string }>()

const key = computed(() => `ms:getting-started:${props.projectId}`)
const dismissed = ref(true)
onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(key.value) === '1'
  }
  catch {
    dismissed.value = false
  }
})
function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(key.value, '1')
  }
  catch {}
}

const { data } = useFetch(() => `/api/projects/${props.projectId}/getting-started`, { server: false })
const inbox = computed(() => `/app/${props.projectId}/inbox`)
const steps = computed(() => data.value
  ? [
      { done: data.value.leads, title: 'Find people asking for your product', body: 'Your inbox fills as we find threads with buying intent.', to: inbox.value, cta: 'Open inbox' },
      { done: data.value.drafted, title: 'Draft a reply', body: 'Open a thread and press Draft reply. Edit it until it sounds like you.', to: inbox.value, cta: 'Pick a thread' },
      { done: data.value.replied, title: 'Post it and mark it Replied', body: 'Copy the reply into the thread yourself, then mark it Replied. That teaches the scoring what a good lead is.', to: inbox.value, cta: 'Go to inbox' },
      { done: data.value.linked, title: 'Add the link to your reply', body: 'In Inbox → Replied, paste your comment\'s URL under the thread so we can check it stays up and count the visits it brings.', to: `${inbox.value}?status=replied`, cta: 'Open replied threads' },
    ]
  : [])
const doneCount = computed(() => steps.value.filter(s => s.done).length)
const next = computed(() => steps.value.find(s => !s.done))

let tracked = false
watch(doneCount, (n) => {
  if (n === 4 && !tracked) {
    tracked = true
    trackClient('onboarding_completed', { project_id: props.projectId })
  }
})
</script>

<template>
  <div v-if="data && !dismissed && next" class="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs/5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <h2 class="font-semibold">Getting started</h2>
        <span class="text-xs text-muted-foreground tabular-nums">{{ doneCount }} of {{ steps.length }}</span>
      </div>
      <button type="button" class="text-muted-foreground hover:text-foreground" aria-label="Hide getting started" @click="dismiss"><XIcon class="size-4" /></button>
    </div>
    <div class="h-1 overflow-hidden rounded-full bg-muted">
      <div class="h-full rounded-full bg-brand transition-all" :style="{ width: `${(doneCount / steps.length) * 100}%` }" />
    </div>
    <ol class="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <li
        v-for="(s, i) in steps"
        :key="s.title"
        class="flex flex-col gap-1 rounded-xl p-2.5 text-sm"
        :class="s === next ? 'bg-brand-soft/70 ring-1 ring-brand/25' : ''"
      >
        <div class="flex items-center gap-2 font-medium" :class="s.done && 'text-muted-foreground line-through decoration-muted-foreground/40'">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]" :class="s.done ? 'border-emerald-500 bg-emerald-500 text-white' : ''">
            <CheckIcon v-if="s.done" class="size-3" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          {{ s.title }}
        </div>
        <p v-if="s === next" class="text-xs text-muted-foreground">{{ s.body }}</p>
        <NuxtLink v-if="s === next && $route.fullPath !== s.to" :to="s.to" class="text-xs font-medium text-brand-foreground underline">{{ s.cta }} →</NuxtLink>
      </li>
    </ol>
  </div>
</template>
