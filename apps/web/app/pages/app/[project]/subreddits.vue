<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = await useFetch(() => `/api/projects/${projectId.value}`)
const { data: map, refresh } = await useFetch(() => `/api/projects/${projectId.value}/subreddits`)
useHead({ title: () => `Subreddits · ${project.value?.name ?? 'Project'}` })

const newSub = ref('')
const discovering = ref(false)

const promoLabel: Record<string, string> = {
  none: 'No promotion',
  weekly_thread_only: 'Promo thread only',
  flair_only: 'Promo flair only',
  allowed_with_value: 'Promo if valuable',
  allowed: 'Promo allowed',
}

function errorMessage(error: unknown) {
  const e = error as { data?: { statusMessage?: string } }
  return e.data?.statusMessage ?? 'Something went wrong'
}

async function setWatching(name: string, watching: boolean) {
  try {
    await $fetch(`/api/projects/${projectId.value}/subreddits`, { method: 'PUT', body: { name, watching } })
    await refresh()
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
  <div class="flex flex-col gap-5">
    <ProjectNav :project-id="projectId" :name="project?.name" />

    <p class="text-sm text-muted-foreground">
      Watched subreddits are checked for new threads every 15 minutes to 6 hours, depending on how busy they are.
      Suggestions come from threads that matched your project.
    </p>

    <div class="flex flex-col gap-2 sm:flex-row">
      <form class="flex flex-1 gap-2" @submit.prevent="add">
        <Input v-model="newSub" placeholder="r/subreddit" class="flex-1" />
        <Button type="submit" variant="secondary">Watch</Button>
      </form>
      <Button :disabled="discovering || !map?.searchConfigured" variant="outline" @click="discover">
        {{ discovering ? 'Starting…' : 'Find threads now' }}
      </Button>
    </div>
    <p v-if="map && !map.searchConfigured" class="text-xs text-muted-foreground">
      Set TINYFISH_API_KEY (free) to discover threads and subreddits through search.
    </p>

    <div v-if="!map?.subreddits.length" class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      No subreddits yet. Watch one above, or run a search to find where your buyers talk.
    </div>

    <div v-for="s in map?.subreddits" :key="s.name" class="flex flex-col gap-3 rounded-xl border p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <a :href="`https://www.reddit.com/r/${s.name}/`" target="_blank" rel="noopener" class="font-medium hover:underline">r/{{ s.name }}</a>
          <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">Fit {{ s.fit }}</Badge>
            <span v-if="s.evidence.scored">{{ s.evidence.hits }}/{{ s.evidence.scored }} threads with intent</span>
            <span v-if="s.evidence.pending">· {{ s.evidence.pending }} waiting for scoring</span>
            <span v-if="!s.evidence.scored && !s.evidence.pending">No matching threads yet</span>
          </div>
        </div>
        <label class="flex shrink-0 items-center gap-2 text-sm">
          <span class="text-muted-foreground">Watch</span>
          <Switch :model-value="s.watching" @update:model-value="(v: boolean) => setWatching(s.name, v)" />
        </label>
      </div>
      <div v-if="s.rules" class="flex flex-col gap-1.5 text-sm">
        <div class="flex flex-wrap gap-1.5">
          <Badge :variant="s.rules.promo_policy === 'none' ? 'destructive' : 'outline'">{{ promoLabel[s.rules.promo_policy] }}</Badge>
          <Badge v-if="s.rules.min_karma != null" variant="outline">{{ s.rules.min_karma }}+ karma</Badge>
          <Badge v-if="s.rules.min_account_age_days != null" variant="outline">{{ s.rules.min_account_age_days }}+ day account</Badge>
          <Badge v-if="s.rules.self_promo_thread" variant="outline">{{ s.rules.self_promo_thread }}</Badge>
        </div>
        <p v-if="s.rules.notes" class="text-muted-foreground">{{ s.rules.notes }}</p>
      </div>
      <p v-else class="text-xs text-muted-foreground">
        Promo rules not in the rules DB yet. Check the sub's rules before posting.
      </p>
    </div>
  </div>
</template>
