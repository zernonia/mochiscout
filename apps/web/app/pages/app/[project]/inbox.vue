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

const kindLabel: Record<string, string> = {
  seeking_tool: 'Looking for a tool',
  comparison: 'Comparing',
  complaint: 'Complaint',
  pain: 'Pain point',
  other: 'Other',
}

const actions: { status: Status, label: string }[] = [
  { status: 'replied', label: 'Replied' },
  { status: 'saved', label: 'Save' },
  { status: 'dismissed', label: 'Dismiss' },
  { status: 'new', label: 'Back to new' },
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

function age(date: string | null) {
  if (!date) return null
  const hours = Math.round((Date.now() - new Date(date).getTime()) / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
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

    <article v-for="t in inbox?.threads" :key="t.id" class="flex flex-col gap-3 rounded-xl border p-4">
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge>{{ t.intent }}</Badge>
        <Badge variant="outline">{{ kindLabel[t.kind] ?? t.kind }}</Badge>
        <span v-if="t.channel">r/{{ t.channel }}</span>
        <span v-if="age(t.createdUtc)">· {{ age(t.createdUtc) }}</span>
        <span v-if="t.searchRankFlag">· ranks in search</span>
      </div>
      <a :href="t.url" target="_blank" rel="noopener" class="font-medium leading-snug hover:underline">{{ t.title }}</a>
      <p v-if="t.snippet" class="line-clamp-3 text-sm text-muted-foreground">{{ t.snippet }}</p>
      <div class="rounded-md bg-muted p-3 text-sm">
        <p>{{ t.reason }}</p>
        <p class="mt-1"><span class="font-medium">Reply angle:</span> {{ t.replyAngle }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="sm">
          <a :href="t.url" target="_blank" rel="noopener">Open thread</a>
        </Button>
        <Button
          v-for="a in actions.filter(a => a.status !== status)"
          :key="a.status"
          size="sm"
          variant="outline"
          @click="setStatus(t.id, a.status)"
        >
          {{ a.label }}
        </Button>
      </div>
    </article>
  </div>
</template>
