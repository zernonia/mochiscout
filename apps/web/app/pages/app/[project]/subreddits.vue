<script setup lang="ts">
import { ChevronDownIcon, HashIcon, ListPlusIcon, SearchIcon, ShieldAlertIcon, ShieldCheckIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: map, refresh } = useCachedFetch(() => `/api/projects/${projectId.value}/subreddits`)
useHead({ title: () => `Subreddits · ${project.value?.name ?? 'Project'}` })

async function onImported() {
  await Promise.all([refresh(), refreshNuxtData('project-nav')])
}
const discovering = ref(false)

// Rules for a newly watched sub are read in the background: check back a few times.
let rulesPolls = 0
watch(map, (m) => {
  const reading = m?.subreddits.some(s => s.watching && !s.rules && !s.rulesReadAt)
  if (!reading || rulesPolls >= 6 || import.meta.server) return
  rulesPolls++
  setTimeout(() => refresh(), 5000)
}, { immediate: true })

const watchedNames = computed(() => map.value?.subreddits.filter(s => s.watching).map(s => s.name) ?? [])
const watchedCount = computed(() => watchedNames.value.length)

function errorMessage(error: unknown) {
  const e = error as { data?: { statusMessage?: string } }
  return e.data?.statusMessage ?? 'Something went wrong'
}

// Toggling is optimistic: the card flips and moves at once (watched first, then by fit,
// as the server sorts), and goes back if the request fails.
let inFlight = 0
function applyWatching(name: string, watching: boolean) {
  if (!map.value) return
  const subreddits = map.value.subreddits
    .map(s => (s.name === name ? { ...s, watching } : s))
    .sort((a, b) => Number(b.watching) - Number(a.watching) || b.fit - a.fit)
  map.value = { ...map.value, subreddits }
}

async function setWatching(name: string, watching: boolean) {
  const known = map.value?.subreddits.some(s => s.name === name)
  if (known) applyWatching(name, watching)
  inFlight++
  try {
    await $fetch(`/api/projects/${projectId.value}/subreddits`, { method: 'PUT', body: { name, watching } })
  }
  catch (error) {
    if (known) applyWatching(name, !watching)
    if (!isPlanLimit(error)) toast.error(errorMessage(error))
  }
  finally {
    inFlight--
  }
  // Sync with the server once quick toggles settle, so a stale answer can't undo a newer flip.
  if (!inFlight) {
    refresh()
    refreshNuxtData('project-nav')
  }
}

async function add(name: string) {
  await setWatching(name, true)
}

async function discover() {
  discovering.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/discover`, { method: 'POST' })
    toast.success('Searching Reddit. New subreddits and threads appear here as results are scored.')
  }
  catch (error) {
    toast.error(errorMessage(error))
  }
  finally {
    discovering.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader
      title="Subreddits"
      description="Where your buyers talk. Watched subreddits are checked for new threads every 15 minutes to 6 hours, depending on how busy they are."
      :icon="HashIcon"
    >
      <template #meta>
        <p v-if="map" class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span class="font-medium text-foreground">{{ watchedCount }}</span> watched · {{ map.subreddits.length - watchedCount }} suggested
        </p>
      </template>
      <template #actions>
        <Button :disabled="discovering || !map?.searchConfigured" variant="outline" @click="discover">
          <SearchIcon /> {{ discovering ? 'Starting…' : 'Find threads now' }}
        </Button>
      </template>
    </AppPageHeader>

    <SubredditPicker :watched="watchedNames" @select="add" />
    <details class="group -mt-3 rounded-2xl border bg-card shadow-xs/5">
      <summary class="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span class="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-foreground" aria-hidden="true"><ListPlusIcon class="size-4" /></span>
        Import a list of subreddits
        <ChevronDownIcon class="ms-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="px-4 pb-4"><SubredditImport :project-id="projectId" @imported="onImported" /></div>
    </details>
    <p v-if="map && !map.searchConfigured" class="-mt-3 text-xs text-muted-foreground">
      Set TINYFISH_API_KEY (free) to discover threads and subreddits through search.
    </p>

    <SkeletonCards v-if="!map" :count="4" :lines="3" :cols="2" />
    <AppEmpty v-else-if="!map.subreddits.length" title="No subreddits yet" description="Watch one above, or run a search to find where your buyers talk." />

    <TransitionGroup tag="div" class="grid grid-cols-1 gap-3 md:grid-cols-2" move-class="transition-transform duration-300 ease-out">
      <div
        v-for="s in map?.subreddits"
        :key="s.name"
        class="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5"
        :class="s.watching && 'border-emerald-500/30 ring-1 ring-emerald-500/20'"
      >
        <div class="flex items-start gap-3">
          <SourceAvatar :channel="s.name" size="lg" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <a :href="`https://www.reddit.com/r/${s.name}/`" target="_blank" rel="noopener" class="truncate font-semibold hover:underline">r/{{ s.name }}</a>
              <span v-if="s.watching" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 text-[11px] leading-5 font-medium text-emerald-700 dark:text-emerald-400">
                <span class="size-1.5 rounded-full bg-emerald-500" /> Watching
              </span>
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              <template v-if="s.evidence.scored">{{ s.evidence.hits }} of {{ s.evidence.scored }} threads had buying intent</template>
              <template v-else-if="s.evidence.pending">{{ s.evidence.pending }} threads waiting to be scored</template>
              <template v-else>No matching threads yet</template>
            </div>
          </div>
          <Switch :model-value="s.watching" :aria-label="`Watch r/${s.name}`" @update:model-value="(v: boolean) => setWatching(s.name, v)" />
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-muted-foreground">Fit</span>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-brand-soft">
            <div class="h-full rounded-full" :class="s.fit >= 40 ? 'bg-brand' : 'bg-brand/40'" :style="{ width: `${Math.max(4, Math.min(100, s.fit))}%` }" />
          </div>
          <span class="w-7 text-end text-sm font-semibold tabular-nums">{{ s.fit }}</span>
        </div>

        <SubredditRulesCard
          :project-id="projectId"
          :name="s.name"
          :rules="s.rules"
          :source="s.rulesSource"
          :library-rules="s.libraryRules"
          :watching="s.watching"
          :read-at="s.rulesReadAt"
          @updated="refresh()"
        />
        <!-- Pooled outcomes across all Mochiscout users -->
        <div v-if="s.verdict.removalRate !== null || s.verdict.linkedReplyRemovalRate !== null" class="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3 text-xs">
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-lg"
            :class="s.verdict.grade === 'strict' ? 'bg-red-500/12 text-red-700 dark:text-red-400' : s.verdict.grade === 'careful' ? 'bg-amber-500/14 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'"
            aria-hidden="true"
          >
            <ShieldCheckIcon v-if="s.verdict.grade !== 'strict' && s.verdict.grade !== 'careful'" class="size-4" />
            <ShieldAlertIcon v-else class="size-4" />
          </span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="font-medium" :class="s.verdict.grade === 'strict' ? 'text-red-700 dark:text-red-400' : s.verdict.grade === 'careful' ? 'text-amber-800 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'">
              {{ s.verdict.grade === 'strict' ? 'Strict moderators' : s.verdict.grade === 'careful' ? 'Promote carefully' : 'Promotion-friendly' }}
            </span>
            <span v-for="r in s.verdict.reasons.filter(r => /removed/.test(r))" :key="r" class="text-muted-foreground">{{ r }}</span>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
