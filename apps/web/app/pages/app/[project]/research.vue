<script setup lang="ts">
import { LightbulbIcon, LoaderIcon, MicroscopeIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useLazyFetch(() => `/api/projects/${projectId.value}`)
const { data: research, refresh } = useLazyFetch(() => `/api/projects/${projectId.value}/research`)
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader
      title="Research"
      :description="`Pain points your buyers talk about, clustered from matching threads${research?.searchConfigured ? ' and Reddit search' : ''}. Use them for posts, landing copy and your roadmap.`"
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
    <Empty v-else-if="!research.points.length" class="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><LightbulbIcon /></EmptyMedia>
        <EmptyTitle>No pain points yet</EmptyTitle>
        <EmptyDescription>Research needs a handful of matching threads: watch some subreddits first{{ research?.searchConfigured ? '' : ', or set a search key' }}.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div class="flex flex-col gap-3">
      <details v-for="p in research?.points" :key="p.id" class="group rounded-xl border bg-card shadow-xs/5" open>
        <summary class="flex cursor-pointer list-none gap-4 p-4 sm:p-5">
          <div class="flex w-14 shrink-0 flex-col items-center gap-1.5 pt-0.5">
            <div class="flex h-8 items-end gap-0.5">
              <span v-for="i in 5" :key="i" class="w-1.5 rounded-sm" :class="i <= p.severity ? severityColor[p.severity] : 'bg-muted'" :style="{ height: `${8 + i * 5}px` }" />
            </div>
            <span class="text-[11px] font-medium text-muted-foreground">{{ severityLabel[p.severity] }}</span>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 class="leading-snug font-medium">{{ p.title }}</h2>
            <p class="text-sm text-muted-foreground">{{ p.summary }}</p>
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              <span v-for="s in p.subreddits" :key="s" class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">r/{{ s }}</span>
              <span class="text-xs text-muted-foreground">· {{ p.evidence.length }} thread{{ p.evidence.length === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </summary>
        <ul v-if="p.evidence.length" class="flex flex-col gap-2 border-t px-4 py-3 sm:ps-[5.75rem]">
          <li v-for="e in p.evidence" :key="e.threadId" class="text-sm">
            <a :href="e.url" target="_blank" rel="noopener" class="hover:underline">"{{ e.paraphrase }}"</a>
            <span class="text-xs text-muted-foreground"> · {{ e.subreddit ? `r/${e.subreddit}` : 'reddit' }}</span>
          </li>
        </ul>
      </details>
    </div>
  </div>
</template>
