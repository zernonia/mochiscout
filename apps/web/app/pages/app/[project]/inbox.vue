<script setup lang="ts">
import { BellIcon, BookmarkIcon, BrainIcon, CheckCheckIcon, FlameIcon, InboxIcon, LockIcon, SparklesIcon, TimerIcon, XIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

type Status = 'new' | 'saved' | 'replied' | 'dismissed'

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const status = ref<Status>('new')
const sort = ref<'opportunity' | 'intent' | 'newest'>('opportunity')
const sorts = [
  { value: 'opportunity', label: 'Best opportunity' },
  { value: 'intent', label: 'Highest intent' },
  { value: 'newest', label: 'Newest' },
] as const
const platform = ref<'reddit' | 'hn' | 'bluesky' | 'x' | undefined>(undefined)
const platforms = [
  { value: undefined, label: 'All sources' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'hn', label: 'Hacker News' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'x', label: 'X' },
] as const

const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: inbox, refresh, status: loadState } = useCachedFetch(() => `/api/projects/${projectId.value}/inbox`, {
  query: { status, platform, sort },
})
useHead({ title: () => `Inbox · ${project.value?.name ?? 'Project'}` })
const { data: me } = useCachedFetch('/api/me')

// Auto-draft replies for new threads (paid plans). A 402 opens the upgrade sheet.
const autoReply = ref(false)
watch(() => project.value?.autoReply, (on) => { autoReply.value = !!on }, { immediate: true })
const savingAuto = ref(false)
async function setAutoReply(enabled: boolean) {
  autoReply.value = enabled
  savingAuto.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/auto-reply`, { method: 'PUT', body: { enabled } })
    if (project.value) project.value.autoReply = enabled
    toast.success(enabled ? 'New threads will get a drafted reply within 15 minutes.' : 'Auto-drafting is off.')
  }
  catch (error) {
    autoReply.value = !enabled
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not change auto-drafting'))
  }
  finally {
    savingAuto.value = false
  }
}

// Email alerts for hot leads (paid plans).
const hotAlerts = ref(false)
watch(() => project.value?.hotAlerts, (on) => { hotAlerts.value = !!on }, { immediate: true })
const savingAlerts = ref(false)
async function setHotAlerts(enabled: boolean) {
  hotAlerts.value = enabled
  savingAlerts.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/hot-alerts`, { method: 'PUT', body: { enabled } })
    if (project.value) project.value.hotAlerts = enabled
    toast.success(enabled ? 'We\'ll email you when a hot lead appears (at most hourly).' : 'Hot lead alerts are off.')
  }
  catch (error) {
    hotAlerts.value = !enabled
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not change alerts'))
  }
  finally {
    savingAlerts.value = false
  }
}

const clearing = ref(false)
async function dismissClosed() {
  clearing.value = true
  try {
    const { dismissed } = await $fetch(`/api/projects/${projectId.value}/threads/dismiss-closed`, { method: 'POST' })
    toast.success(`Cleared ${dismissed} thread${dismissed === 1 ? '' : 's'} that can't be answered.`)
    await Promise.all([refresh(), refreshNuxtData('project-nav')])
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not clear them'))
  }
  finally {
    clearing.value = false
  }
}

const learned = computed(() => {
  const l = inbox.value?.learning
  return l ? l.replied + l.saved + l.dismissed : 0
})

const tabs = [
  { value: 'new' as const, label: 'New', icon: InboxIcon },
  { value: 'saved' as const, label: 'Saved', icon: BookmarkIcon },
  { value: 'replied' as const, label: 'Replied', icon: CheckCheckIcon },
  { value: 'dismissed' as const, label: 'Dismissed', icon: XIcon },
]

async function setStatus(threadId: string, next: Status, dismissReason?: string) {
  try {
    await $fetch(`/api/projects/${projectId.value}/threads/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      body: { status: next, dismissReason },
    })
    await Promise.all([refresh(), refreshNuxtData('project-nav')])
  }
  catch {
    toast.error('Could not update the thread')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader
      title="Inbox"
      :description="`Threads scored ${inbox?.threshold ?? 60}+ for buying intent, best opportunities first: fresh, uncrowded and still open. Draft a reply, edit it, then copy it into the thread.`"
    >
      <template #actions>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Label class="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2 font-normal shadow-xs/5">
            <SparklesIcon class="size-4 text-violet-600 dark:text-violet-400" />
            <span class="flex flex-1 flex-col leading-tight">
              <span class="flex items-center gap-1.5 text-sm font-medium">
                Auto-draft replies
                <span v-if="me && !me.limits.autoReplies" class="rounded-full bg-violet-500/12 px-1.5 text-[10px] leading-4 font-medium text-violet-700 dark:text-violet-400">Solo+</span>
              </span>
              <span class="text-xs text-muted-foreground">For hot leads</span>
            </span>
            <Switch :model-value="autoReply" :disabled="savingAuto" class="ms-1" @update:model-value="(v: boolean) => setAutoReply(v)" />
          </Label>
          <Label class="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2 font-normal shadow-xs/5">
            <BellIcon class="size-4 text-orange-600 dark:text-orange-400" />
            <span class="flex flex-1 flex-col leading-tight">
              <span class="flex items-center gap-1.5 text-sm font-medium">
                Hot lead alerts
                <span v-if="me && !me.limits.hotAlerts" class="rounded-full bg-violet-500/12 px-1.5 text-[10px] leading-4 font-medium text-violet-700 dark:text-violet-400">Solo+</span>
              </span>
              <span class="text-xs text-muted-foreground">By email, at most hourly</span>
            </span>
            <Switch :model-value="hotAlerts && (!me || me.limits.hotAlerts)" :disabled="savingAlerts" class="ms-1" @update:model-value="(v: boolean) => setHotAlerts(v)" />
          </Label>
        </div>
      </template>
    </AppPageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-auto">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
          :class="status === tab.value ? 'bg-background font-medium shadow-xs/5' : 'text-muted-foreground hover:text-foreground'"
          @click="status = tab.value"
        >
          <component :is="tab.icon" class="size-4" />
          {{ tab.label }}
          <span
            v-if="inbox?.counts[tab.value]"
            class="rounded-full px-1.5 text-[11px] leading-5 tabular-nums"
            :class="tab.value === 'new' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-background text-muted-foreground'"
          >{{ inbox.counts[tab.value] }}</span>
        </button>
      </div>
      <div class="flex gap-1.5 overflow-x-auto">
        <button
          v-for="p in platforms"
          :key="p.label"
          type="button"
          class="shrink-0 rounded-full border px-3 py-1 text-xs transition-colors"
          :class="platform === p.value ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
          @click="platform = p.value"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="inbox" class="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span v-if="status === 'new' && inbox.hot" class="inline-flex items-center gap-1 font-medium text-orange-700 dark:text-orange-400"><FlameIcon class="size-3.5" /> {{ inbox.hot }} hot lead{{ inbox.hot === 1 ? '' : 's' }}: reply while {{ inbox.hot === 1 ? 'it\'s' : 'they\'re' }} fresh</span>
      <span class="inline-flex items-center gap-1">
        <BrainIcon class="size-3.5" />
        <template v-if="learned">Scoring learns from your {{ learned }} decision{{ learned === 1 ? '' : 's' }}<template v-if="inbox.learning.edited">, drafts from your {{ inbox.learning.edited }} edited repl{{ inbox.learning.edited === 1 ? 'y' : 'ies' }}</template></template>
        <template v-else>Reply, save or dismiss with a reason: scoring learns what fits you</template>
      </span>
      <span class="ms-auto flex items-center gap-1">
        Sort
        <select v-model="sort" class="rounded-md border bg-background px-1.5 py-0.5 text-xs text-foreground" aria-label="Sort threads">
          <option v-for="o in sorts" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </span>
    </div>

    <Alert v-if="inbox && status === 'new' && inbox.closed > 0">
      <LockIcon />
      <AlertTitle>{{ inbox.closed }} thread{{ inbox.closed === 1 ? '' : 's' }} can't be answered any more</AlertTitle>
      <AlertDescription class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Archived, locked or removed since they were found. They're at the bottom of the list.</span>
        <Button size="xs" variant="outline" :loading="clearing" @click="dismissClosed">Clear them</Button>
      </AlertDescription>
    </Alert>

    <Alert v-if="inbox && inbox.pendingScoring > 0" variant="info">
      <TimerIcon />
      <AlertTitle>{{ inbox.pendingScoring }} matching threads waiting to be scored</AlertTitle>
      <AlertDescription>
        {{ inbox.llmConfigured
          ? 'They are scored on the next scheduled run, every 15 minutes.'
          : 'Set ANTHROPIC_API_KEY to score them for buying intent.' }}
      </AlertDescription>
    </Alert>

    <SkeletonThreads v-if="!inbox" />
    <Empty v-else-if="!inbox.threads.length" class="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><component :is="tabs.find(t => t.value === status)!.icon" /></EmptyMedia>
        <EmptyTitle>{{ status === 'new' ? 'No new threads yet' : `Nothing ${status}` }}</EmptyTitle>
        <EmptyDescription>
          <template v-if="status === 'new'">Threads scoring {{ inbox?.threshold ?? 60 }}+ show up here as they are found. Watching more subreddits widens the net.</template>
          <template v-else>Threads you mark as {{ status }} appear here.</template>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="status === 'new'">
        <Button as-child size="sm" variant="outline"><NuxtLink :to="`/app/${projectId}/subreddits`">Find subreddits</NuxtLink></Button>
      </EmptyContent>
    </Empty>

    <!-- Switching tabs keeps the current list on screen, dimmed, until the new one arrives. -->
    <div class="flex flex-col gap-3 transition-opacity" :class="loadState === 'pending' && 'pointer-events-none opacity-50'">
      <ThreadCard v-for="t in inbox?.threads" :key="t.id" :project-id="projectId" :thread="t" :status="status" @status="(next, reason) => setStatus(t.id, next, reason)" />
    </div>
  </div>
</template>
