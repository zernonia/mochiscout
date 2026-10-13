<script setup lang="ts">
import { ChevronDownIcon, LightbulbIcon, LoaderIcon, MicroscopeIcon, QuoteIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: research, refresh } = useCachedFetch(() => `/api/projects/${projectId.value}/research`)
useHead({ title: () => `Research · ${project.value?.name ?? 'Project'}` })

const starting = ref(false)
let poll: ReturnType<typeof setInterval> | undefined

function watchRun() {
  clearInterval(poll)
  poll = setInterval(async () => {
    await refresh()
    if (!research.value?.running) clearInterval(poll)
  }, 5000)
}
// Data loads lazily, so start polling whenever a run is in progress.
watch(() => research.value?.running, (running) => { if (running && import.meta.client) watchRun() }, { immediate: true })
onBeforeUnmount(() => clearInterval(poll))

async function run() {
  starting.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/research`, { method: 'POST' })
    await refresh()
    watchRun()
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not start research'))
  }
  finally {
    starting.value = false
  }
}

const severityLabel = ['', 'Mild', 'Noticeable', 'Real', 'Costly', 'Urgent']
const severityColor = ['', 'bg-neutral-400', 'bg-sky-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500']
const severityTile = ['', 'bg-muted text-muted-foreground', 'bg-sky-500/10 text-sky-700', 'bg-amber-500/12 text-amber-800', 'bg-orange-500/12 text-orange-700', 'bg-red-500/10 text-red-700']
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader
      title="Research"
      :description="`Pain points your buyers talk about, clustered from matching threads${research?.searchConfigured ? ' and Reddit search' : ''}. Use them for posts, landing copy and your roadmap.`"
      :icon="LightbulbIcon"
    >
      <template #meta>
        <p v-if="research?.ranAt" class="mt-1 text-xs text-muted-foreground">Last run {{ new Date(research.ranAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }} · re-runs weekly</p>
      </template>
      <template #actions>
        <Button :disabled="starting || research?.running || !research?.llmConfigured" @click="run">
          <LoaderIcon v-if="research?.running" class="animate-spin" /><MicroscopeIcon v-else />
          {{ research?.running ? 'Researching…' : research?.ranAt ? 'Run again' : 'Run research' }}
        </Button>
      </template>
    </AppPageHeader>
    <p v-if="research && !research.llmConfigured" class="-mt-3 text-xs text-muted-foreground">Set ANTHROPIC_API_KEY to run research.</p>

    <SkeletonCards v-if="!research" :count="3" :lines="2" />
    <AppEmpty
      v-else-if="!research.points.length"
      title="No pain points yet"
      :description="`Research needs a handful of matching threads: watch some subreddits first${research?.searchConfigured ? '' : ', or set a search key'}.`"
    />

    <div class="flex flex-col gap-3">
      <details v-for="p in research?.points" :key="p.id" class="group overflow-hidden rounded-2xl border bg-card shadow-xs/5" open>
        <summary class="flex cursor-pointer list-none gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div class="flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 self-start rounded-xl py-2.5" :class="severityTile[p.severity]">
            <div class="flex h-7 items-end gap-0.5" aria-hidden="true">
              <span v-for="i in 5" :key="i" class="w-1.5 rounded-full" :class="i <= p.severity ? severityColor[p.severity] : 'bg-current opacity-15'" :style="{ height: `${8 + i * 4}px` }" />
            </div>
            <span class="text-[11px] font-semibold">{{ severityLabel[p.severity] }}</span>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-start gap-2">
              <h2 class="flex-1 leading-snug font-semibold">{{ p.title }}</h2>
              <ChevronDownIcon v-if="p.evidence.length" class="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </div>
            <p class="text-sm text-muted-foreground">{{ p.summary }}</p>
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span v-for="s in p.subreddits" :key="s" class="inline-flex items-center gap-1.5 rounded-lg border bg-background p-0.5 pe-2 text-xs text-muted-foreground">
                <SourceAvatar :channel="s" size="sm" />r/{{ s }}
              </span>
              <span class="text-xs text-muted-foreground">· {{ p.evidence.length }} thread{{ p.evidence.length === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </summary>
        <ul v-if="p.evidence.length" class="flex flex-col gap-2 border-t bg-muted/30 px-4 py-3.5 sm:ps-[6.25rem]">
          <li v-for="e in p.evidence" :key="e.threadId" class="flex items-start gap-2 text-sm">
            <QuoteIcon class="mt-1 size-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span class="min-w-0">
              <a :href="e.url" target="_blank" rel="noopener" class="hover:underline">"{{ e.paraphrase }}"</a>
              <span class="text-xs text-muted-foreground"> · {{ e.subreddit ? `r/${e.subreddit}` : 'reddit' }}</span>
            </span>
          </li>
        </ul>
      </details>
    </div>
  </div>
</template>
