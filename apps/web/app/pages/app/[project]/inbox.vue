<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'app' })

type Status = 'new' | 'saved' | 'replied' | 'dismissed'

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const status = ref<Status>('new')

const { data: project } = await useFetch(() => `/api/projects/${projectId.value}`)
const { data: inbox, refresh } = await useFetch(() => `/api/projects/${projectId.value}/inbox`, {
  query: { status },
})
useHead({ title: () => `Inbox · ${project.value?.name ?? 'Project'}` })

const tabs: { value: Status, label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'saved', label: 'Saved' },
  { value: 'replied', label: 'Replied' },
  { value: 'dismissed', label: 'Dismissed' },
]

async function setStatus(threadId: string, next: Status) {
  try {
    await $fetch(`/api/projects/${projectId.value}/threads/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      body: { status: next },
    })
    await refresh()
  }
  catch {
    toast.error('Could not update the thread')
  }
}

</script>

<template>
  <div class="flex flex-col gap-5">
    <ProjectNav :project-id="projectId" :name="project?.name" />

    <div class="flex gap-1 overflow-x-auto">
      <Button
        v-for="tab in tabs"
        :key="tab.value"
        size="sm"
        :variant="status === tab.value ? 'secondary' : 'ghost'"
        @click="status = tab.value"
      >
        {{ tab.label }}
        <span v-if="inbox?.counts[tab.value]" class="text-muted-foreground">{{ inbox.counts[tab.value] }}</span>
      </Button>
    </div>

    <Alert v-if="inbox && inbox.pendingScoring > 0">
      <AlertTitle>{{ inbox.pendingScoring }} matching threads waiting for scoring</AlertTitle>
      <AlertDescription>
        {{ inbox.llmConfigured
          ? 'They are scored on the next scheduled run (every 15 minutes).'
          : 'Set ANTHROPIC_API_KEY to score them for buying intent.' }}
      </AlertDescription>
    </Alert>

    <div v-if="!inbox?.threads.length" class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <template v-if="status === 'new'">
        No threads at intent {{ inbox?.threshold ?? 60 }}+ yet. Watch a few subreddits and new threads show up here as they are scored.
      </template>
      <template v-else>
        Nothing here.
      </template>
    </div>

    <ThreadCard v-for="t in inbox?.threads" :key="t.id" :thread="t" :status="status" @status="next => setStatus(t.id, next)" />
  </div>
</template>
