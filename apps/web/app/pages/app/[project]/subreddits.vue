<script setup lang="ts">
import { EyeIcon, HashIcon, SearchIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: map, refresh } = useCachedFetch(() => `/api/projects/${projectId.value}/subreddits`)
useHead({ title: () => `Subreddits · ${project.value?.name ?? 'Project'}` })

const newSub = ref('')
async function onImported() {
  await Promise.all([refresh(), refreshNuxtData('project-nav')])
}
const discovering = ref(false)

const watchedCount = computed(() => map.value?.subreddits.filter(s => s.watching).length ?? 0)

function errorMessage(error: unknown) {
  const e = error as { data?: { statusMessage?: string } }
  return e.data?.statusMessage ?? 'Something went wrong'
}

async function setWatching(name: string, watching: boolean) {
  try {
    await $fetch(`/api/projects/${projectId.value}/subreddits`, { method: 'PUT', body: { name, watching } })
    await Promise.all([refresh(), refreshNuxtData('project-nav')])
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(errorMessage(error))
  }
}

async function add() {
  if (!newSub.value.trim()) return
  await setWatching(newSub.value, true)
  newSub.value = ''
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
    >
      <template #meta>
        <p v-if="map" class="mt-1 text-xs text-muted-foreground"><span class="font-medium text-foreground">{{ watchedCount }}</span> watched · {{ map.subreddits.length - watchedCount }} suggested</p>
      </template>
      <template #actions>
        <Button :disabled="discovering || !map?.searchConfigured" variant="outline" @click="discover">
          <SearchIcon /> {{ discovering ? 'Starting…' : 'Find threads now' }}
        </Button>
      </template>
    </AppPageHeader>

    <form class="flex gap-2" @submit.prevent="add">
      <InputGroup class="flex-1">
        <InputGroupAddon><HashIcon /></InputGroupAddon>
        <InputGroupInput v-model="newSub" placeholder="Add a subreddit to watch, e.g. SaaS" aria-label="Subreddit" />
      </InputGroup>
      <Button type="submit"><EyeIcon /> Watch</Button>
    </form>
    <details class="-mt-3 rounded-lg border p-3">
      <summary class="cursor-pointer text-sm font-medium">Import a list of subreddits</summary>
      <div class="mt-3"><SubredditImport :project-id="projectId" @imported="onImported" /></div>
    </details>
    <p v-if="map && !map.searchConfigured" class="-mt-3 text-xs text-muted-foreground">
      Set TINYFISH_API_KEY (free) to discover threads and subreddits through search.
    </p>

    <SkeletonCards v-if="!map" :count="4" :lines="3" :cols="2" />
    <Empty v-else-if="!map.subreddits.length" class="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><HashIcon /></EmptyMedia>
        <EmptyTitle>No subreddits yet</EmptyTitle>
        <EmptyDescription>Watch one above, or run a search to find where your buyers talk.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div class="grid gap-3 md:grid-cols-2">
      <div
        v-for="s in map?.subreddits"
        :key="s.name"
        class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs/5"
        :class="s.watching && 'ring-1 ring-emerald-500/40'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <a :href="`https://www.reddit.com/r/${s.name}/`" target="_blank" rel="noopener" class="truncate font-medium hover:underline">r/{{ s.name }}</a>
              <span v-if="s.watching" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-1.5 text-[11px] leading-5 font-medium text-emerald-700 dark:text-emerald-400">
                <span class="size-1.5 rounded-full bg-emerald-500" /> Watching
              </span>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              <template v-if="s.evidence.scored">{{ s.evidence.hits }} of {{ s.evidence.scored }} threads had buying intent</template>
              <template v-else-if="s.evidence.pending">{{ s.evidence.pending }} threads waiting to be scored</template>
              <template v-else>No matching threads yet</template>
            </div>
          </div>
          <Switch :model-value="s.watching" :aria-label="`Watch r/${s.name}`" @update:model-value="(v: boolean) => setWatching(s.name, v)" />
        </div>

        <div class="flex items-center gap-2">
          <span class="w-8 text-xs text-muted-foreground">Fit</span>
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full" :class="s.fit >= 70 ? 'bg-emerald-500' : s.fit >= 40 ? 'bg-amber-500' : 'bg-neutral-400'" :style="{ width: `${Math.max(4, Math.min(100, s.fit))}%` }" />
          </div>
          <span class="w-8 text-end text-xs font-medium tabular-nums">{{ s.fit }}</span>
        </div>

        <SubredditRulesCard
          :project-id="projectId"
          :name="s.name"
          :rules="s.rules"
          :source="s.rulesSource"
          :library-rules="s.libraryRules"
          @updated="refresh()"
        />
        <!-- Pooled outcomes across all Mochiscout users -->
        <div v-if="s.verdict.removalRate !== null || s.verdict.linkedReplyRemovalRate !== null" class="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-2.5 text-xs">
          <span class="font-medium" :class="s.verdict.grade === 'strict' ? 'text-red-700 dark:text-red-400' : s.verdict.grade === 'careful' ? 'text-amber-800 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'">
            {{ s.verdict.grade === 'strict' ? 'Strict moderators' : s.verdict.grade === 'careful' ? 'Promote carefully' : 'Promotion-friendly' }}
          </span>
          <span v-for="r in s.verdict.reasons.filter(r => /removed/.test(r))" :key="r" class="text-muted-foreground">{{ r }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
