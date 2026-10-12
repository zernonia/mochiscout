<script setup lang="ts">
import type { ProjectProfile } from '~/components/ProjectProfileForm.vue'
import { ArrowRightIcon, CheckIcon, LoaderIcon, PencilIcon, SparklesIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })
useHead({ title: 'New project · Mochiscout' })

const { data: me } = useCachedFetch('/api/me')
const { data: projects } = useCachedFetch('/api/projects')
const first = computed(() => projects.value?.length === 0)

const url = ref('')
const analysing = ref(false)
const saving = ref(false)
const editing = ref(false)
const profile = ref<ProjectProfile | null>(null)

/** Extra sources the plan includes are on by default (X needs a server key, so it stays opt-in). */
function defaultSources(): ProjectProfile['sources'] {
  const allowed = me.value?.limits.sources ?? []
  return (['hn', 'bluesky'] as const).filter(s => allowed.includes(s))
}

function blank(u = ''): ProjectProfile {
  return { url: u, name: '', category: '', icp: '', problems: [], keywords: [], competitors: [], searchTerms: [], sources: defaultSources() }
}

// What the user sees while the page is read and the profile drafted (about 10-20 seconds).
const STAGES = ['Reading your site', 'Working out who buys it', 'Picking what to search for']
const stage = ref(0)
let stageTimer: ReturnType<typeof setInterval> | undefined

async function analyse() {
  analysing.value = true
  stage.value = 0
  stageTimer = setInterval(() => { stage.value = Math.min(stage.value + 1, STAGES.length - 1) }, 4500)
  try {
    const res = await $fetch('/api/onboarding/extract', { method: 'POST', body: { url: url.value } })
    profile.value = {
      url: res.url,
      name: res.profile.product,
      category: res.profile.category,
      icp: res.profile.icp,
      problems: res.profile.problems_solved,
      keywords: res.profile.keywords,
      competitors: res.profile.competitors,
      searchTerms: res.profile.search_terms,
      sources: defaultSources(),
    }
    editing.value = false
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not read that page'))
    profile.value = blank(/^https?:\/\//i.test(url.value) ? url.value : url.value && `https://${url.value}`)
    editing.value = true
  }
  finally {
    clearInterval(stageTimer)
    analysing.value = false
  }
}
onBeforeUnmount(() => clearInterval(stageTimer))

const ready = computed(() => !!profile.value?.name.trim() && !!profile.value.url.trim())

async function save() {
  if (!profile.value) return
  if (!ready.value) {
    editing.value = true
    toast.info('Add your product name and URL first.')
    return
  }
  saving.value = true
  try {
    const project = await $fetch('/api/projects', { method: 'POST', body: profile.value })
    // The inbox builds the first feed while the user watches (?welcome=1).
    await navigateTo(`/app/${project!.id}/inbox?welcome=1`)
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not create the project'))
  }
  finally {
    saving.value = false
  }
}

const sourceNames: Record<string, string> = { hn: 'Hacker News', bluesky: 'Bluesky', x: 'X' }
const watching = computed(() => ['Reddit', ...(profile.value?.sources ?? []).map(s => sourceNames[s])].join(', '))
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <!-- Step 1: the URL -->
    <template v-if="!profile">
      <AppPageHeader
        :title="first ? 'Let\'s find your first customers' : 'New project'"
        description="Paste your product's URL. We read the page, work out who buys it, and search Reddit, Hacker News and Bluesky for people asking for it."
      />
      <Card>
        <CardContent class="flex flex-col gap-4">
          <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="analyse">
            <Input v-model="url" type="text" inputmode="url" placeholder="yourproduct.com" required class="h-11 flex-1" :disabled="analysing" aria-label="Product URL" autofocus />
            <Button type="submit" size="lg" class="h-11" :loading="analysing">Analyse <ArrowRightIcon /></Button>
          </form>
          <ol v-if="analysing" class="flex flex-col gap-1.5 text-sm" aria-live="polite">
            <li v-for="(s, i) in STAGES" :key="s" class="flex items-center gap-2" :class="i > stage && 'text-muted-foreground'">
              <CheckIcon v-if="i < stage" class="size-4 text-emerald-600" />
              <LoaderIcon v-else-if="i === stage" class="size-4 animate-spin text-violet-600" />
              <span v-else class="size-4" />
              {{ s }}…
            </li>
          </ol>
          <button v-else type="button" class="self-start text-sm text-muted-foreground underline" @click="profile = blank(); editing = true">
            No website yet? Describe your product instead
          </button>
        </CardContent>
      </Card>
      <p v-if="first" class="text-center text-xs text-muted-foreground">Takes about a minute. You can change everything later in Project profile.</p>
    </template>

    <!-- Step 2: confirm -->
    <form v-else class="flex flex-col gap-6" @submit.prevent="save">
      <AppPageHeader
        :title="editing ? 'Describe your product' : `Here's what we found for ${profile.name || 'your product'}`"
        :description="editing ? 'This drives the searches and the scoring. Be specific about who buys it.' : 'Check it looks right. This is what we search for and score against.'"
      />

      <Card v-if="!editing">
        <CardContent class="flex flex-col gap-4 text-sm">
          <div>
            <div class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Who buys it</div>
            <p class="mt-1">{{ profile.icp || '–' }}</p>
          </div>
          <div v-if="profile.problems.length">
            <div class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Problems it solves</div>
            <ul class="mt-1 list-disc pl-5">
              <li v-for="p in profile.problems.slice(0, 3)" :key="p">{{ p }}</li>
            </ul>
          </div>
          <div v-if="profile.keywords.length || profile.competitors.length">
            <div class="text-xs font-medium tracking-wide text-muted-foreground uppercase">We'll look for</div>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <Badge v-for="k in profile.keywords.slice(0, 6)" :key="k" variant="outline">{{ k }}</Badge>
              <Badge v-for="c in profile.competitors.slice(0, 4)" :key="c" variant="outline">alternatives to {{ c }}</Badge>
            </div>
          </div>
          <div>
            <div class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Where</div>
            <p class="mt-1">{{ watching }}</p>
          </div>
          <button type="button" class="inline-flex items-center gap-1 self-start text-muted-foreground underline" @click="editing = true">
            <PencilIcon class="size-3.5" /> Edit details
          </button>
        </CardContent>
      </Card>

      <Card v-else>
        <CardContent>
          <ProjectProfileForm v-model="profile" />
        </CardContent>
      </Card>

      <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" :loading="saving"><SparklesIcon /> {{ saving ? 'Setting up…' : 'Find my first leads' }}</Button>
        <Button type="button" variant="ghost" :disabled="saving" @click="profile = null; editing = false">Start over</Button>
      </div>
    </form>
  </div>
</template>
