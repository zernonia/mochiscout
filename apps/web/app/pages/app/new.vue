<script setup lang="ts">
import type { ProjectProfile } from '~/components/ProjectProfileForm.vue'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, LoaderIcon, PencilIcon, SparklesIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

/**
 * Onboarding as one distraction-free modal: the product URL, a short check
 * of what we read, then the first feed built while the user watches. It
 * ends in the inbox. A first project can't be skipped; later ones can close.
 */
definePageMeta({ layout: 'app' })
useHead({ title: 'Set up · Mochiscout' })

const { data: me } = useCachedFetch('/api/me')
const { data: projects } = useCachedFetch('/api/projects')
const first = computed(() => projects.value?.length === 0)

type Step = 'url' | 'review' | 'edit' | 'building' | 'result'
const step = ref<Step>('url')
const STEP_INDEX: Record<Step, number> = { url: 0, review: 1, edit: 1, building: 2, result: 2 }
const STEP_LABELS = ['Your product', 'Check it', 'First leads']

const open = ref(true)
function close() {
  // Mid-build the project exists: closing goes to its inbox, where the feed keeps filling.
  if (projectId.value) return navigateTo(`/app/${projectId.value}/inbox`)
  return navigateTo('/app')
}
watch(open, (v) => {
  if (!v) close()
})

/** Every onboarding failure goes to PostHog with its step and status, so we can see where people get stuck. */
function reportFailure(where: 'analyse' | 'create' | 'build', error: unknown) {
  const e = error as { statusCode?: number, status?: number, statusMessage?: string, data?: { statusMessage?: string } }
  trackClient('onboarding_failed', { step: where, status: e.statusCode ?? e.status ?? null, message: e.data?.statusMessage ?? e.statusMessage ?? String(error).slice(0, 200), url: url.value })
}

// ---- Step 1: URL ----------------------------------------------------------
const url = ref('')
const analysing = ref(false)
const profile = ref<ProjectProfile | null>(null)

/** Extra sources the plan includes are on by default (X needs a server key, so it stays opt-in). */
function defaultSources(): ProjectProfile['sources'] {
  const allowed = me.value?.limits.sources ?? []
  return (['hn', 'bluesky'] as const).filter(s => allowed.includes(s))
}
function blank(u = ''): ProjectProfile {
  return { url: u, name: '', category: '', icp: '', problems: [], keywords: [], competitors: [], searchTerms: [], sources: defaultSources() }
}

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
    step.value = 'review'
  }
  catch (error) {
    reportFailure('analyse', error)
    const status = (error as { statusCode?: number }).statusCode ?? 0
    toast.error(status >= 500 && status !== 503
      ? 'We couldn\'t read that page right now. Describe your product below instead.'
      : apiErrorMessage(error, 'Could not read that page'))
    profile.value = blank(/^https?:\/\//i.test(url.value) ? url.value : url.value && `https://${url.value}`)
    step.value = 'edit'
  }
  finally {
    clearInterval(stageTimer)
    analysing.value = false
  }
}
function describeInstead() {
  profile.value = blank()
  step.value = 'edit'
}

// ---- Step 2: check ---------------------------------------------------------
const saving = ref(false)
const projectId = ref<string | null>(null)
const sourceNames: Record<string, string> = { hn: 'Hacker News', bluesky: 'Bluesky', x: 'X' }
const where = computed(() => ['Reddit', ...(profile.value?.sources ?? []).map(s => sourceNames[s])].join(', '))

async function create() {
  if (!profile.value) return
  if (!profile.value.name.trim() || !profile.value.url.trim()) {
    step.value = 'edit'
    toast.info('Add your product name and URL first.')
    return
  }
  saving.value = true
  try {
    const project = await $fetch('/api/projects', { method: 'POST', body: profile.value })
    projectId.value = project!.id
    refreshNuxtData('sidebar-projects')
    step.value = 'building'
    build()
  }
  catch (error) {
    reportFailure('create', error)
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not create the project'))
  }
  finally {
    saving.value = false
  }
}

// ---- Step 3: first feed ----------------------------------------------------
type Lead = { id: string, title: string, channel: string | null, platform: string, intent: number }
const found = ref(0)
const scored = ref(0)
const pending = ref(0)
const leadCount = ref(0)
const watched = ref<string[]>([])
const topLeads = ref<Lead[]>([])
const note = ref('')
const buildPhase = ref<'searching' | 'scoring' | 'watching'>('searching')
const MAX_SCORE_CALLS = 4

async function build() {
  const endpoint = `/api/projects/${projectId.value}/kickstart`
  try {
    buildPhase.value = 'searching'
    const d = await $fetch<{ searched: boolean, found: number, pending: number }>(endpoint, { method: 'POST', body: { step: 'discover' } })
    found.value = d.found
    pending.value = d.pending
    if (!d.searched && !d.pending) note.value = 'Search isn\'t configured on this server, so the first threads arrive with the next scheduled check.'
    buildPhase.value = 'scoring'
    for (let i = 0; i < MAX_SCORE_CALLS && pending.value > 0; i++) {
      const s = await $fetch<{ scored: number, pending: number, leads: number, llm: boolean }>(endpoint, { method: 'POST', body: { step: 'score' } })
      if (!s.llm) {
        note.value = 'Scoring isn\'t configured on this server (ANTHROPIC_API_KEY).'
        break
      }
      scored.value += s.scored
      pending.value = s.pending
      leadCount.value = s.leads
      if (!s.scored) break
    }
    buildPhase.value = 'watching'
    try {
      watched.value = (await $fetch<{ watched: string[] }>(endpoint, { method: 'POST', body: { step: 'watch' } })).watched
    }
    catch {}
    if (leadCount.value) {
      const inbox = await $fetch<{ threads: Lead[] }>(`/api/projects/${projectId.value}/inbox`).catch(() => null)
      topLeads.value = inbox?.threads.slice(0, 3) ?? []
    }
  }
  catch (error) {
    reportFailure('build', error)
    note.value = apiErrorMessage(error, 'Something went wrong while building your feed. It keeps filling in the background.')
  }
  step.value = 'result'
}

const buildSteps = computed(() => [
  { label: 'Searching for recent posts', active: buildPhase.value === 'searching', done: buildPhase.value !== 'searching', detail: found.value ? `${found.value} found` : '' },
  { label: `Scoring who needs ${profile.value?.name || 'your product'}`, active: buildPhase.value === 'scoring', done: buildPhase.value === 'watching', detail: scored.value ? `${scored.value} scored` : '' },
  { label: 'Picking subreddits to watch', active: buildPhase.value === 'watching', done: false, detail: '' },
])

function finish() {
  navigateTo(`/app/${projectId.value}/inbox`)
}
onBeforeUnmount(() => clearInterval(stageTimer))
</script>

<template>
  <Dialog v-model:open="open">
    <DialogPopup
      class="max-w-xl shadow-xl sm:max-h-[min(720px,90dvh)]"
      backdrop-class="bg-background/95 backdrop-blur-md"
      :show-close-button="!first && step !== 'building'"
      :bottom-stick-on-mobile="false"
      @escape-key-down="(e: Event) => (first || step === 'building') && e.preventDefault()"
      @interact-outside="(e: Event) => e.preventDefault()"
      @focus-outside="(e: Event) => e.preventDefault()"
    >
      <div class="flex min-h-0 flex-col gap-6 overflow-y-auto p-6 sm:p-8">
        <!-- Progress -->
        <div class="flex items-center gap-2 pe-8">
          <template v-for="(label, i) in STEP_LABELS" :key="label">
            <div class="flex items-center gap-1.5 text-xs" :class="i <= STEP_INDEX[step] ? 'text-foreground' : 'text-muted-foreground'">
              <span class="flex size-5 items-center justify-center rounded-full border text-[11px] font-medium" :class="i < STEP_INDEX[step] ? 'border-foreground bg-foreground text-background' : i === STEP_INDEX[step] ? 'border-foreground' : ''">
                <CheckIcon v-if="i < STEP_INDEX[step]" class="size-3" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="hidden sm:inline">{{ label }}</span>
            </div>
            <div v-if="i < STEP_LABELS.length - 1" class="h-px flex-1 bg-border" />
          </template>
        </div>

        <!-- 1. URL -->
        <section v-if="step === 'url'" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-2xl font-semibold tracking-tight">{{ first ? 'Let\'s find your first customers' : 'Add a product' }}</DialogTitle>
            <DialogDescription class="text-muted-foreground">Paste your product's URL. We read the page, work out who buys it, and look for people asking for it on Reddit, Hacker News and Bluesky.</DialogDescription>
          </div>
          <form class="flex flex-col gap-3" @submit.prevent="analyse">
            <Input v-model="url" type="text" inputmode="url" placeholder="yourproduct.com" required class="h-12 text-base" :disabled="analysing" aria-label="Product URL" autofocus />
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
          <button v-else type="button" class="self-center text-sm text-muted-foreground underline" @click="describeInstead">No website yet? Describe your product instead</button>
        </section>

        <!-- 2. Check -->
        <section v-else-if="step === 'review' && profile" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-2xl font-semibold tracking-tight">Here's what we found for {{ profile.name || 'your product' }}</DialogTitle>
            <DialogDescription class="text-muted-foreground">This is what we search for and score against. Fix anything that's off.</DialogDescription>
          </div>
          <dl class="flex flex-col gap-4 rounded-xl border p-4 text-sm">
            <div>
              <dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Who buys it</dt>
              <dd class="mt-1">{{ profile.icp || '–' }}</dd>
            </div>
            <div v-if="profile.problems.length">
              <dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Problems it solves</dt>
              <dd><ul class="mt-1 list-disc pl-5"><li v-for="p in profile.problems.slice(0, 3)" :key="p">{{ p }}</li></ul></dd>
            </div>
            <div v-if="profile.keywords.length || profile.competitors.length">
              <dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">We'll look for</dt>
              <dd class="mt-1.5 flex flex-wrap gap-1.5">
                <Badge v-for="k in profile.keywords.slice(0, 6)" :key="k" variant="outline">{{ k }}</Badge>
                <Badge v-for="c in profile.competitors.slice(0, 4)" :key="c" variant="outline">alternatives to {{ c }}</Badge>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Where</dt>
              <dd class="mt-1">{{ where }}</dd>
            </div>
          </dl>
          <div class="flex flex-col gap-2">
            <Button size="lg" class="h-11" :loading="saving" @click="create"><SparklesIcon /> {{ saving ? 'Setting up…' : 'Looks right, find my first leads' }}</Button>
            <div class="flex justify-between text-sm">
              <button type="button" class="inline-flex items-center gap-1 text-muted-foreground underline" @click="step = 'url'"><ArrowLeftIcon class="size-3.5" /> Different URL</button>
              <button type="button" class="inline-flex items-center gap-1 text-muted-foreground underline" @click="step = 'edit'"><PencilIcon class="size-3.5" /> Edit details</button>
            </div>
          </div>
        </section>

        <!-- 2b. Edit -->
        <form v-else-if="step === 'edit' && profile" class="flex flex-col gap-5" @submit.prevent="create">
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-2xl font-semibold tracking-tight">Describe your product</DialogTitle>
            <DialogDescription class="text-muted-foreground">This drives the searches and the scoring. Be specific about who buys it.</DialogDescription>
          </div>
          <ProjectProfileForm v-model="profile" />
          <div class="sticky -bottom-6 -mx-6 flex flex-col gap-2 border-t bg-popover px-6 pt-4 pb-6 sm:-bottom-8 sm:-mx-8 sm:px-8 sm:pb-8">
            <Button type="submit" size="lg" class="h-11" :loading="saving"><SparklesIcon /> {{ saving ? 'Setting up…' : 'Find my first leads' }}</Button>
            <button type="button" class="inline-flex items-center gap-1 self-start text-sm text-muted-foreground underline" @click="step = profile.keywords.length ? 'review' : 'url'"><ArrowLeftIcon class="size-3.5" /> Back</button>
          </div>
        </form>

        <!-- 3. Building -->
        <section v-else-if="step === 'building'" class="flex flex-col gap-5" aria-live="polite">
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-2xl font-semibold tracking-tight">Finding people who need {{ profile?.name || 'your product' }}…</DialogTitle>
            <DialogDescription class="text-muted-foreground">This takes about a minute. We're reading the last week of posts.</DialogDescription>
          </div>
          <ol class="flex flex-col gap-3 text-sm">
            <li v-for="s in buildSteps" :key="s.label" class="flex items-center gap-2.5" :class="!s.done && !s.active && 'text-muted-foreground'">
              <CheckIcon v-if="s.done" class="size-4 text-emerald-600" />
              <LoaderIcon v-else-if="s.active" class="size-4 animate-spin text-violet-600" />
              <span v-else class="size-4" />
              <span>{{ s.label }}</span>
              <span v-if="s.detail" class="text-xs text-muted-foreground">· {{ s.detail }}</span>
            </li>
          </ol>
        </section>

        <!-- 3. Result -->
        <section v-else-if="step === 'result'" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <DialogTitle class="text-2xl font-semibold tracking-tight">
              {{ leadCount ? `${leadCount} ${leadCount === 1 ? 'person' : 'people'} may need ${profile?.name || 'your product'}` : 'Your feed is set up' }}
            </DialogTitle>
            <DialogDescription class="text-muted-foreground">
              {{ leadCount ? 'Open one, press Draft reply, edit it in your own words and post it yourself.' : 'No strong matches in the last week yet. New posts are checked every 15 minutes, and we\'ll email you when a hot one appears.' }}
            </DialogDescription>
          </div>
          <ol v-if="topLeads.length" class="flex flex-col divide-y rounded-xl border text-sm">
            <li v-for="t in topLeads" :key="t.id" class="flex items-start gap-3 p-3">
              <span class="mt-0.5 rounded-md bg-emerald-500/12 px-1.5 text-xs font-semibold text-emerald-800 tabular-nums dark:text-emerald-300">{{ t.intent }}</span>
              <div class="min-w-0">
                <div class="line-clamp-2 font-medium">{{ t.title }}</div>
                <div class="text-xs text-muted-foreground">{{ t.channel ? `r/${t.channel}` : sourceNames[t.platform] ?? t.platform }}</div>
              </div>
            </li>
          </ol>
          <p v-if="watched.length" class="text-sm text-muted-foreground">Watching {{ watched.map(w => `r/${w}`).join(', ') }} for new posts every 15 minutes.</p>
          <p v-if="note" class="text-sm text-muted-foreground">{{ note }}</p>
          <details v-if="!leadCount" class="rounded-lg border p-3">
            <summary class="cursor-pointer text-sm font-medium">Add subreddits you already know</summary>
            <div class="mt-3"><SubredditImport :project-id="projectId!" /></div>
          </details>
          <Button size="lg" class="h-11" @click="finish">{{ leadCount ? `See ${leadCount === 1 ? 'it' : `all ${leadCount}`} in your inbox` : 'Go to your inbox' }} <ArrowRightIcon /></Button>
        </section>
      </div>
    </DialogPopup>
  </Dialog>
</template>
