<script setup lang="ts">
import { EyeIcon, HashIcon, SearchIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = await useFetch(() => `/api/projects/${projectId.value}`)
const { data: map, refresh } = await useFetch(() => `/api/projects/${projectId.value}/subreddits`)
useHead({ title: () => `Subreddits · ${project.value?.name ?? 'Project'}` })

const newSub = ref('')
const discovering = ref(false)

const promo: Record<string, { label: string, class: string }> = {
  none: { label: 'No promotion', class: 'border-red-500/30 bg-red-500/8 text-red-700 dark:text-red-400' },
  weekly_thread_only: { label: 'Promo thread only', class: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' },
  flair_only: { label: 'Promo flair only', class: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' },
  allowed_with_value: { label: 'Promo if valuable', class: 'border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-400' },
  allowed: { label: 'Promo allowed', class: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400' },
}

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
    <p v-if="map && !map.searchConfigured" class="-mt-3 text-xs text-muted-foreground">
      Set TINYFISH_API_KEY (free) to discover threads and subreddits through search.
    </p>

    <Empty v-if="!map?.subreddits.length" class="rounded-xl border border-dashed">
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

        <div v-if="s.rules" class="flex flex-col gap-1.5 text-sm">
          <div class="flex flex-wrap gap-1.5">
            <span class="rounded-full border px-2 py-0.5 text-xs font-medium" :class="promo[s.rules.promo_policy]?.class">{{ promo[s.rules.promo_policy]?.label }}</span>
            <Badge v-if="s.rules.min_karma != null" variant="outline">{{ s.rules.min_karma }}+ karma</Badge>
            <Badge v-if="s.rules.min_account_age_days != null" variant="outline">{{ s.rules.min_account_age_days }}+ day account</Badge>
            <Badge v-if="s.rules.self_promo_thread" variant="outline">{{ s.rules.self_promo_thread }}</Badge>
          </div>
          <p v-if="s.rules.notes" class="text-xs text-muted-foreground">{{ s.rules.notes }}</p>
        </div>
        <p v-else class="text-xs text-muted-foreground">
          Promo rules not in our database yet. Read the sub's rules before posting.
        </p>
        <SuggestRules :subreddit="s.name" :current="s.rules" />
      </div>
    </div>
  </div>
</template>
