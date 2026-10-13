<script setup lang="ts">
import { ChartColumnIcon, CheckCircle2Icon, CircleAlertIcon, CircleHelpIcon, CodeIcon, CopyIcon, MessageSquareReplyIcon, MousePointerClickIcon, TargetIcon, TrendingUpIcon, UserPlusIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const days = ref(30)
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: results } = useCachedFetch(() => `/api/projects/${projectId.value}/results`, { query: { days } })
useHead({ title: () => `Results · ${project.value?.name ?? 'Project'}` })

const requestOrigin = useRequestURL().origin
const origin = computed(() => (import.meta.client ? location.origin : requestOrigin))
const snippet = computed(() => `<script defer src="${origin.value}/t.js" data-project="${projectId.value}"><\/script>`)
const signupCall = `window.mochiscout?.('signup')`

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  }
  catch {
    toast.error('Could not copy. Select the text and copy it yourself.')
  }
}

const statusInfo = {
  live: { label: 'Live', class: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2Icon },
  removed: { label: 'Removed', class: 'bg-red-500/12 text-red-700 dark:text-red-400', icon: CircleAlertIcon },
  unknown: { label: 'Checking', class: 'bg-muted text-muted-foreground', icon: CircleHelpIcon },
} as const

// Visits per day for the small bar chart (oldest first).
const daily = computed(() => results.value?.daily ?? [])
const dailyMax = computed(() => Math.max(1, ...daily.value.map(d => d.visits)))
const dailyLabel = computed(() => {
  const busiest = daily.value.reduce<{ day: string, visits: number } | null>((a, d) => (!a || d.visits > a.visits ? d : a), null)
  return busiest?.visits ? `Visits per day over the last ${daily.value.length} days. Busiest: ${when(busiest.day)}, ${busiest.visits} visits.` : `No visits in the last ${daily.value.length} days.`
})

function when(d: string | Date | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Results" description="What replying brought you: replies posted, how many stayed up, and the visits and sign-ups from your tracking links." :icon="TrendingUpIcon">
      <template #actions>
        <select v-model.number="days" class="h-9 rounded-xl border bg-card px-3 text-sm shadow-xs/5 focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none" aria-label="Period">
          <option :value="7">Last 7 days</option>
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
        </select>
      </template>
    </AppPageHeader>

    <SkeletonStats v-if="!results" />
    <div v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Replies posted" :value="results.replied" :icon="MessageSquareReplyIcon" tone="brand" />
      <StatTile label="Still up" :value="results.tracked ? `${results.live}/${results.tracked}` : '–'" :hint="results.tracked ? [results.removed ? `${results.removed} removed` : '', results.tracked - results.live - results.removed ? `${results.tracked - results.live - results.removed} being checked` : ''].filter(Boolean).join(' · ') || 'none removed' : 'Add reply links to track'" :tone="results.removed ? 'warn' : 'good'" :icon="CheckCircle2Icon" />
      <StatTile label="Visits" :value="results.visits" :icon="MousePointerClickIcon" tone="info" hint="From tracking links" :trend="results.daily.map(d => d.visits)" />
      <StatTile label="Sign-ups" :value="results.signups" :icon="UserPlusIcon" :tone="results.signups ? 'good' : 'neutral'" hint="From tracking links" :trend="results.daily.map(d => d.signups)" />
    </div>

    <!-- Visits per day -->
    <section v-if="results && daily.length" class="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 class="flex items-center gap-2 font-semibold tracking-tight"><ChartColumnIcon class="size-5 text-brand" /> Visits per day</h2>
        <div class="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-brand/30" /> Visits</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-brand" /> Sign-ups</span>
        </div>
      </div>
      <div role="img" :aria-label="dailyLabel" class="flex h-28 items-end gap-[2px] border-b border-dashed pb-px sm:gap-1">
        <div
          v-for="d in daily"
          :key="d.day"
          :title="`${when(d.day)}: ${d.visits} visit${d.visits === 1 ? '' : 's'}, ${d.signups} sign-up${d.signups === 1 ? '' : 's'}`"
          class="flex h-full min-w-0 flex-1 flex-col justify-end"
        >
          <div
            class="flex w-full flex-col justify-end overflow-hidden rounded-t-[3px]"
            :class="d.visits ? 'bg-brand/30' : 'bg-muted'"
            :style="{ height: d.visits ? `${Math.max(6, (d.visits / dailyMax) * 100)}%` : '3px' }"
          >
            <div v-if="d.signups" class="w-full bg-brand" :style="{ height: `${Math.min(100, (d.signups / Math.max(d.visits, 1)) * 100)}%` }" />
          </div>
        </div>
      </div>
      <div class="-mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums" aria-hidden="true">
        <span>{{ when(daily[0]!.day) }}</span>
        <span>{{ when(daily[daily.length - 1]!.day) }}</span>
      </div>
    </section>

    <!-- Setup -->
    <div v-if="results && !results.installed" class="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5">
      <div class="flex items-start gap-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-foreground" aria-hidden="true"><CodeIcon class="size-4" /></span>
        <div class="min-w-0">
          <h2 class="font-semibold">Count visits and sign-ups from your replies</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            In the inbox, "Copy tracking link" gives you your own URL with <code class="rounded bg-muted px-1 text-xs">?ref=ms_…</code> for that thread.
            The link goes straight to your site, never through us. Add this script to {{ results.projectUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') }} so we can count what it brings:
          </p>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">1. In your site's &lt;head&gt;</Label>
        <div class="flex items-start gap-2">
          <pre class="min-w-0 flex-1 overflow-x-auto rounded-xl bg-muted/70 px-3 py-2 text-xs"><code>{{ snippet }}</code></pre>
          <Button size="sm" variant="outline" @click="copy(snippet, 'Script')"><CopyIcon /> Copy</Button>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">2. Where a sign-up succeeds (optional)</Label>
        <div class="flex items-start gap-2">
          <pre class="min-w-0 flex-1 overflow-x-auto rounded-xl bg-muted/70 px-3 py-2 text-xs"><code>{{ signupCall }}</code></pre>
          <Button size="sm" variant="outline" @click="copy(signupCall, 'Call')"><CopyIcon /> Copy</Button>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">No cookies and no IP addresses are stored: the script only reports that a visit or sign-up came from a tracking link, and remembers the link for 30 days in the visitor's browser.</p>
    </div>

    <!-- Lead quality: how often a scored lead turned out to be real, from your own decisions -->
    <section v-if="results" class="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5">
      <div class="flex flex-col gap-1">
        <h2 class="flex items-center gap-2 font-semibold tracking-tight"><TargetIcon class="size-5 text-brand" /> Lead quality</h2>
        <span class="text-xs text-muted-foreground">From {{ results.quality.decisions }} decision{{ results.quality.decisions === 1 ? '' : 's' }}: replied or saved counts as a real lead, dismissed as "not relevant" or "not my audience" as a miss</span>
      </div>
      <p v-if="results.quality.precision === null" class="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
        Reply, save or dismiss a few more threads in the inbox and we'll show how many of your leads are real, by score.
      </p>
      <template v-else>
        <p class="text-sm">
          <span class="text-2xl font-semibold tabular-nums">{{ Math.round(results.quality.precision * 100) }}%</span>
          <span class="text-muted-foreground"> of inbox threads (score {{ results.threshold }}+) you acted on were real leads.</span>
        </p>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div v-for="b in results.quality.bands" :key="b.label" class="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-3">
            <div class="flex justify-between gap-2 text-xs"><span class="font-medium">Score {{ b.label }}</span><span class="text-muted-foreground tabular-nums">{{ b.good }} real · {{ b.bad }} misses</span></div>
            <div class="h-1.5 overflow-hidden rounded-full bg-background">
              <div class="h-full rounded-full bg-brand" :style="{ width: `${Math.round((b.precision ?? 0) * 100)}%` }" />
            </div>
            <span class="text-xs tabular-nums" :class="b.precision === null ? 'text-muted-foreground' : ''">{{ b.precision === null ? 'Not enough decisions yet' : `${Math.round(b.precision * 100)}% real` }}</span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">Scoring also learns from these decisions: your recent replies and dismissals are shown to the scorer as examples.</p>
      </template>
    </section>

    <!-- Replies -->
    <SkeletonCards v-if="!results" :count="2" :lines="2" />
    <AppEmpty v-else-if="!results.rows.length" title="No replies yet" description="Mark threads as replied in the inbox and paste your reply's link to track it here.">
      <Button as-child size="sm" variant="outline"><NuxtLink :to="`/app/${projectId}/inbox`">Open the inbox</NuxtLink></Button>
    </AppEmpty>
    <div v-else class="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
      <div class="hidden grid-cols-[1fr_110px_70px_70px] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
        <div class="ps-12">Thread</div><div>Your reply</div><div class="text-right">Visits</div><div class="text-right">Sign-ups</div>
      </div>
      <div v-for="r in results.rows" :key="r.threadId" class="grid grid-cols-1 gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_110px_70px_70px] sm:items-center sm:gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <SourceAvatar :channel="r.channel" :platform="r.platform" />
          <div class="min-w-0">
            <a :href="r.url" target="_blank" rel="noopener" class="line-clamp-1 text-sm font-medium hover:underline">{{ r.title }}</a>
            <div class="text-xs text-muted-foreground">{{ r.channel ? `r/${r.channel}` : r.platform }} · replied {{ when(r.repliedAt) }}</div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 ps-12 sm:contents">
          <div>
            <a v-if="r.replyUrl" :href="r.replyUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" :class="statusInfo[r.replyStatus ?? 'unknown'].class">
              <component :is="statusInfo[r.replyStatus ?? 'unknown'].icon" class="size-3" /> {{ statusInfo[r.replyStatus ?? 'unknown'].label }}
            </a>
            <span v-else class="text-xs text-muted-foreground">No link</span>
          </div>
          <div class="text-sm tabular-nums sm:text-right"><span class="text-xs text-muted-foreground sm:hidden">Visits </span>{{ r.visits }}</div>
          <div class="text-sm font-medium tabular-nums sm:text-right"><span class="text-xs font-normal text-muted-foreground sm:hidden">Sign-ups </span>{{ r.signups }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
