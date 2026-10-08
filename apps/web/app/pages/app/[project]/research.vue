<script setup lang="ts">
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = await useFetch(() => `/api/projects/${projectId.value}`)
const { data: research, refresh } = await useFetch(() => `/api/projects/${projectId.value}/research`)
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
onMounted(() => { if (research.value?.running) watchRun() })
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
</script>

<template>
  <div class="flex flex-col gap-5">
    <ProjectNav :project-id="projectId" :name="project?.name" />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">
        <template v-if="research?.ranAt">Last run {{ new Date(research.ranAt).toLocaleString() }}. Re-runs weekly.</template>
        <template v-else>Pain points your buyers talk about, clustered from matching threads{{ research?.searchConfigured ? ' and Reddit search' : '' }}.</template>
      </p>
      <Button :disabled="starting || research?.running || !research?.llmConfigured" @click="run">
        {{ research?.running ? 'Researching…' : research?.ranAt ? 'Run again' : 'Run research' }}
      </Button>
    </div>
    <p v-if="research && !research.llmConfigured" class="text-xs text-muted-foreground">Set ANTHROPIC_API_KEY to run research.</p>

    <div v-if="!research?.points.length" class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      No pain points yet. Research needs at least a handful of matching threads: watch some subreddits first{{ research?.searchConfigured ? '' : ', or set a search key' }}.
    </div>

    <details v-for="p in research?.points" :key="p.id" class="group rounded-xl border p-4" open>
      <summary class="flex cursor-pointer list-none flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <Badge :variant="p.severity >= 4 ? 'default' : 'secondary'">{{ severityLabel[p.severity] }} · {{ p.severity }}/5</Badge>
          <span v-for="s in p.subreddits" :key="s" class="text-muted-foreground">r/{{ s }}</span>
        </div>
        <h2 class="font-medium leading-snug">{{ p.title }}</h2>
        <p class="text-sm text-muted-foreground">{{ p.summary }}</p>
      </summary>
      <ul class="mt-3 flex flex-col gap-2 border-t pt-3">
        <li v-for="e in p.evidence" :key="e.threadId" class="text-sm">
          <a :href="e.url" target="_blank" rel="noopener" class="hover:underline">{{ e.paraphrase }}</a>
          <span class="text-xs text-muted-foreground"> · {{ e.subreddit ? `r/${e.subreddit}` : 'reddit' }}</span>
        </li>
      </ul>
    </details>
  </div>
</template>
