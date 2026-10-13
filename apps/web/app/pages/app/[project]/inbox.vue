<script setup lang="ts">
import { BellIcon, BookmarkIcon, BrainIcon, CheckCheckIcon, FlameIcon, InboxIcon, LockIcon, SparklesIcon, TimerIcon, XIcon, ZapIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

type Status = 'new' | 'saved' | 'replied' | 'dismissed'

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const STATUSES: Status[] = ['new', 'saved', 'replied', 'dismissed']
// The tab is in the URL (?status=replied) so other pages can link to it.
const status = ref<Status>(STATUSES.includes(route.query.status as Status) ? route.query.status as Status : 'new')
watch(status, (s) => { navigateTo({ query: { ...route.query, status: s === 'new' ? undefined : s } }, { replace: true }) })
watch(() => route.query.status, (q) => {
  const next = STATUSES.includes(q as Status) ? q as Status : 'new'
  if (next !== status.value) status.value = next
})
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
  // Reply, save and dismiss edit the list in place.
  deep: true,
})
// Dim the list only while a different tab, source or sort loads, not during background refreshes.
const switching = ref(false)
watch([status, platform, sort], () => {
  switching.value = true
  // A cached answer may never go pending.
  nextTick(() => { if (loadState.value !== 'pending') switching.value = false })
})
watch(loadState, (s) => { if (s !== 'pending') switching.value = false })
useHead({ title: () => `Inbox · ${project.value?.name ?? 'Project'}` })

// Activation: the first time leads are on screen for this project in this browser.
watch(() => inbox.value?.threads.length, (n) => {
  if (!import.meta.client || !n || status.value !== 'new') return
  const key = `ms:leads-seen:${projectId.value}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  }
  catch { /* storage blocked: still count it */ }
  trackClient('leads_seen', { project_id: projectId.value, leads: n })
}, { immediate: true })
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

const changeStatus = useThreadStatus(projectId)
function setStatus(thread: NonNullable<typeof inbox.value>['threads'][number], next: Status, dismissReason?: string) {
  if (!inbox.value) return
  changeStatus({ list: inbox.value.threads, thread, from: status.value, to: next, reason: dismissReason, counts: inbox.value.counts })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Inbox" :icon="InboxIcon" :description="`Threads scored ${inbox?.threshold ?? 60}+ for buying intent, best first.`">
      <template #actions>
        <Menu>
          <MenuTrigger as-child>
            <Button variant="outline" size="sm">
              <ZapIcon /> Automations
              <span v-if="autoReply || (hotAlerts && me?.limits.hotAlerts)" class="size-1.5 rounded-full bg-brand" aria-label="On" />
            </Button>
          </MenuTrigger>
          <MenuPopup align="end" class="w-76">
            <MenuCheckboxItem variant="switch" :model-value="autoReply" :disabled="savingAuto" @update:model-value="(v: boolean | 'indeterminate') => setAutoReply(v === true)">
              <span class="flex flex-col gap-0.5 py-1">
                <span class="flex items-center gap-1.5 font-medium"><SparklesIcon class="size-4 text-brand" /> Auto-draft replies
                  <span v-if="me && !me.limits.autoReplies" class="rounded-full bg-brand-soft px-1.5 text-[10px] leading-4 font-medium text-brand-foreground">Solo+</span>
                </span>
                <span class="text-xs text-muted-foreground">A drafted reply for every hot lead</span>
              </span>
            </MenuCheckboxItem>
            <MenuCheckboxItem variant="switch" :model-value="hotAlerts && (!me || me.limits.hotAlerts)" :disabled="savingAlerts" @update:model-value="(v: boolean | 'indeterminate') => setHotAlerts(v === true)">
              <span class="flex flex-col gap-0.5 py-1">
                <span class="flex items-center gap-1.5 font-medium"><BellIcon class="size-4 text-brand" /> Hot lead alerts
                  <span v-if="me && !me.limits.hotAlerts" class="rounded-full bg-brand-soft px-1.5 text-[10px] leading-4 font-medium text-brand-foreground">Solo+</span>
                </span>
                <span class="text-xs text-muted-foreground">Email, Slack or Discord, at most hourly</span>
              </span>
            </MenuCheckboxItem>
            <MenuSeparator />
            <MenuItem @select="navigateTo(`/app/${projectId}/profile`)">Set up Slack or Discord</MenuItem>
          </MenuPopup>
        </Menu>
      </template>
    </AppPageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:w-auto">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
          :class="status === tab.value ? 'bg-background font-medium text-foreground shadow-xs/5 [&>svg]:text-brand' : 'text-muted-foreground hover:text-foreground'"
          @click="status = tab.value"
        >
          <component :is="tab.icon" class="size-4" />
          {{ tab.label }}
          <span
            v-if="inbox?.counts[tab.value]"
            class="rounded-full px-1.5 text-[11px] leading-5 tabular-nums"
            :class="tab.value === 'new' ? 'bg-brand text-primary-foreground' : 'bg-background text-muted-foreground'"
          >{{ inbox.counts[tab.value] }}</span>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="platform" class="h-8 rounded-lg border bg-card px-2 text-sm" aria-label="Source">
          <option v-for="p in platforms" :key="p.label" :value="p.value">{{ p.label }}</option>
        </select>
        <select v-model="sort" class="h-8 rounded-lg border bg-card px-2 text-sm" aria-label="Sort threads">
          <option v-for="o in sorts" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
    </div>

    <ClientOnly>
      <GettingStarted :project-id="projectId" />
    </ClientOnly>

    <p v-if="inbox && status === 'new' && inbox.hot" class="-mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-foreground">
      <FlameIcon class="size-4" /> {{ inbox.hot }} hot lead{{ inbox.hot === 1 ? '' : 's' }}: reply while {{ inbox.hot === 1 ? 'it\'s' : 'they\'re' }} fresh
    </p>

    <div v-if="inbox && status === 'new' && inbox.closed > 0" class="flex items-center gap-2.5 rounded-xl bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
      <LockIcon class="size-4 shrink-0" />
      <span class="flex-1">{{ inbox.closed }} thread{{ inbox.closed === 1 ? '' : 's' }} can't be answered any more (archived, locked or removed). They're at the bottom.</span>
      <Button size="xs" variant="ghost" :loading="clearing" @click="dismissClosed">Clear</Button>
    </div>
    <div v-if="inbox && inbox.pendingScoring > 0" class="flex items-center gap-2.5 rounded-xl bg-sky-500/8 px-3 py-2 text-sm text-sky-900 dark:text-sky-200">
      <TimerIcon class="size-4 shrink-0" />
      <span>{{ inbox.pendingScoring }} matching thread{{ inbox.pendingScoring === 1 ? '' : 's' }} waiting to be scored. {{ inbox.llmConfigured ? 'Scored every 15 minutes.' : 'Set ANTHROPIC_API_KEY to score them.' }}</span>
    </div>

    <SkeletonThreads v-if="!inbox" />
    <AppEmpty
      v-else-if="!inbox.threads.length"
      :title="status === 'new' ? 'No new threads yet' : `Nothing ${status}`"
      :description="status === 'new' ? `Threads scoring ${inbox?.threshold ?? 60}+ show up here as they are found. Watching more subreddits widens the net.` : status === 'saved' ? 'Save a thread you want to answer later and it waits here, draft and all.' : `Threads you mark as ${status} appear here.`"
    >
      <Button v-if="status === 'new'" as-child size="sm" variant="outline"><NuxtLink :to="`/app/${projectId}/subreddits`">Find subreddits</NuxtLink></Button>
    </AppEmpty>

    <!-- Switching tabs keeps the current list on screen, dimmed, until the new one arrives. -->
    <TransitionGroup
      tag="div"
      class="relative flex flex-col gap-3 transition-opacity"
      :class="switching && loadState === 'pending' && 'pointer-events-none opacity-50'"
      move-class="transition-transform duration-300 ease-out"
      leave-active-class="absolute inset-x-0 transition duration-200 ease-in"
      leave-to-class="translate-x-8 opacity-0"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
    >
      <ThreadCard v-for="t in inbox?.threads" :key="t.id" :project-id="projectId" :thread="t" :status="status" @status="(next, reason) => setStatus(t, next, reason)" />
    </TransitionGroup>

    <p v-if="inbox?.threads.length" class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <BrainIcon class="size-3.5" />
      <template v-if="learned">Scoring learns from your {{ learned }} decision{{ learned === 1 ? '' : 's' }}<template v-if="inbox.learning.edited">, drafts from your {{ inbox.learning.edited }} edited repl{{ inbox.learning.edited === 1 ? 'y' : 'ies' }}</template></template>
      <template v-else>Reply, save or dismiss with a reason: scoring learns what fits you</template>
    </p>
  </div>
</template>
