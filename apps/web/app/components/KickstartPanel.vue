<script setup lang="ts">
import { CheckIcon, LoaderIcon, SearchIcon, SparklesIcon } from '@lucide/vue'

/**
 * A new project's first feed, built while the user watches: search for recent
 * threads, then score them a batch at a time. The scheduled jobs take over after.
 */
const props = defineProps<{ projectId: string, productName: string }>()
const emit = defineEmits<{ done: [number] }>()

type Phase = 'searching' | 'scoring' | 'done' | 'empty' | 'error'
const phase = ref<Phase>('searching')
const found = ref(0)
const scored = ref(0)
const pending = ref(0)
const leads = ref(0)
const note = ref('')
const MAX_SCORE_CALLS = 4

async function run() {
  const url = `/api/projects/${props.projectId}/kickstart`
  try {
    phase.value = 'searching'
    const d = await $fetch<{ searched: boolean, found: number, pending: number }>(url, { method: 'POST', body: { step: 'discover' } })
    found.value = d.found
    pending.value = d.pending
    if (!d.searched && !d.pending) note.value = 'No search provider is configured, so the first threads arrive with the next scheduled fetch.'
    phase.value = 'scoring'
    for (let i = 0; i < MAX_SCORE_CALLS && pending.value > 0; i++) {
      const s = await $fetch<{ scored: number, pending: number, leads: number, llm: boolean }>(url, { method: 'POST', body: { step: 'score' } })
      if (!s.llm) {
        note.value = 'Set ANTHROPIC_API_KEY to score threads for buying intent.'
        break
      }
      scored.value += s.scored
      pending.value = s.pending
      leads.value = s.leads
      if (!s.scored) break
    }
    phase.value = leads.value ? 'done' : 'empty'
    emit('done', leads.value)
  }
  catch (error) {
    note.value = apiErrorMessage(error, 'Something went wrong while building your feed.')
    phase.value = 'error'
  }
}
onMounted(run)

const steps = computed(() => [
  { label: 'Searching Reddit, Hacker News and Bluesky for recent posts', done: phase.value !== 'searching', active: phase.value === 'searching', detail: found.value ? `${found.value} found` : '' },
  { label: `Scoring each one for whether they need ${props.productName}`, done: ['done', 'empty'].includes(phase.value), active: phase.value === 'scoring', detail: scored.value ? `${scored.value} scored${pending.value ? `, ${pending.value} to go` : ''}` : '' },
])
</script>

<template>
  <div class="flex flex-col gap-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.03] p-5">
    <div class="flex items-center gap-2 font-semibold">
      <SparklesIcon class="size-4 text-violet-600 dark:text-violet-400" />
      <template v-if="phase === 'done'">Found {{ leads }} {{ leads === 1 ? 'person' : 'people' }} who may need {{ productName }}</template>
      <template v-else-if="phase === 'empty'">Your feed is set up</template>
      <template v-else-if="phase === 'error'">We couldn't finish the first search</template>
      <template v-else>Building your first feed…</template>
    </div>
    <ol class="flex flex-col gap-2 text-sm">
      <li v-for="s in steps" :key="s.label" class="flex items-center gap-2" :class="!s.done && !s.active && 'text-muted-foreground'">
        <CheckIcon v-if="s.done" class="size-4 text-emerald-600" />
        <LoaderIcon v-else-if="s.active" class="size-4 animate-spin text-violet-600" />
        <SearchIcon v-else class="size-4" />
        <span>{{ s.label }}</span>
        <span v-if="s.detail" class="text-xs text-muted-foreground">· {{ s.detail }}</span>
      </li>
    </ol>
    <p v-if="phase === 'done'" class="text-sm text-muted-foreground">They're below, best first. Draft a reply to any of them, edit it, and post it yourself.</p>
    <p v-else-if="phase === 'empty'" class="text-sm text-muted-foreground">No strong matches in the last week yet. New posts are checked every 15 minutes; watching the right subreddits helps most.</p>
    <p v-if="note" class="text-sm text-muted-foreground">{{ note }}</p>

    <details class="rounded-lg border bg-background p-3" :open="phase === 'empty'">
      <summary class="cursor-pointer text-sm font-medium">Watch subreddits you already know</summary>
      <div class="mt-3"><SubredditImport :project-id="projectId" /></div>
    </details>
  </div>
</template>
