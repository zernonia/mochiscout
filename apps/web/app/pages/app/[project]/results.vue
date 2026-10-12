<script setup lang="ts">
import { CheckCircle2Icon, CircleAlertIcon, CircleHelpIcon, CopyIcon, MessageSquareReplyIcon, MousePointerClickIcon, UserPlusIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const days = ref(30)
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: results } = useCachedFetch(() => `/api/projects/${projectId.value}/results`, { query: { days } })
useHead({ title: () => `Results · ${project.value?.name ?? 'Project'}` })

const origin = computed(() => (import.meta.client ? location.origin : 'https://mochiscout.com'))
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

function when(d: string | Date | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Results" description="What replying brought you: replies posted, how many stayed up, and the visits and sign-ups from your tracking links.">
      <template #actions>
        <select v-model.number="days" class="rounded-md border bg-background px-2 py-1.5 text-sm" aria-label="Period">
          <option :value="7">Last 7 days</option>
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
        </select>
      </template>
    </AppPageHeader>

    <SkeletonStats v-if="!results" />
    <div v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Replies posted" :value="results.replied" :icon="MessageSquareReplyIcon" />
      <StatTile label="Still up" :value="results.tracked ? `${results.live}/${results.tracked}` : '–'" :hint="results.tracked ? [results.removed ? `${results.removed} removed` : '', results.tracked - results.live - results.removed ? `${results.tracked - results.live - results.removed} being checked` : ''].filter(Boolean).join(' · ') || 'none removed' : 'Add reply links to track'" :tone="results.removed ? 'warn' : 'good'" :icon="CheckCircle2Icon" />
      <StatTile label="Visits" :value="results.visits" :icon="MousePointerClickIcon" tone="info" hint="From tracking links" />
      <StatTile label="Sign-ups" :value="results.signups" :icon="UserPlusIcon" :tone="results.signups ? 'good' : 'neutral'" hint="From tracking links" />
    </div>

    <!-- Setup -->
    <div v-if="results && !results.installed" class="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs/5">
      <div>
        <h2 class="font-semibold">Count visits and sign-ups from your replies</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          In the inbox, "Copy tracking link" gives you your own URL with <code class="rounded bg-muted px-1 text-xs">?ref=ms_…</code> for that thread.
          The link goes straight to your site, never through us. Add this script to {{ results.projectUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') }} so we can count what it brings:
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">1. In your site's &lt;head&gt;</Label>
        <div class="flex items-start gap-2">
          <pre class="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs"><code>{{ snippet }}</code></pre>
          <Button size="sm" variant="outline" @click="copy(snippet, 'Script')"><CopyIcon /> Copy</Button>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">2. Where a sign-up succeeds (optional)</Label>
        <div class="flex items-start gap-2">
          <pre class="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs"><code>{{ signupCall }}</code></pre>
          <Button size="sm" variant="outline" @click="copy(signupCall, 'Call')"><CopyIcon /> Copy</Button>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">No cookies and no IP addresses are stored: the script only reports that a visit or sign-up came from a tracking link, and remembers the link for 30 days in the visitor's browser.</p>
    </div>

    <!-- Lead quality: how often a scored lead turned out to be real, from your own decisions -->
    <div v-if="results" class="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs/5">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="font-semibold">Lead quality</h2>
        <span class="text-xs text-muted-foreground">From {{ results.quality.decisions }} decision{{ results.quality.decisions === 1 ? '' : 's' }}: replied or saved counts as a real lead, dismissed as "not relevant" or "not my audience" as a miss</span>
      </div>
      <p v-if="results.quality.precision === null" class="text-sm text-muted-foreground">
        Reply, save or dismiss a few more threads in the inbox and we'll show how many of your leads are real, by score.
      </p>
      <template v-else>
        <p class="text-sm">
          <span class="text-2xl font-semibold tabular-nums">{{ Math.round(results.quality.precision * 100) }}%</span>
          <span class="text-muted-foreground"> of inbox threads (score {{ results.threshold }}+) you acted on were real leads.</span>
        </p>
        <div class="grid gap-2 sm:grid-cols-3">
          <div v-for="b in results.quality.bands" :key="b.label" class="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
            <div class="flex justify-between text-xs"><span class="font-medium">Score {{ b.label }}</span><span class="text-muted-foreground tabular-nums">{{ b.good }} real · {{ b.bad }} misses</span></div>
            <div class="h-1.5 overflow-hidden rounded-full bg-background">
              <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${Math.round((b.precision ?? 0) * 100)}%` }" />
            </div>
            <span class="text-xs tabular-nums" :class="b.precision === null ? 'text-muted-foreground' : ''">{{ b.precision === null ? 'Not enough decisions yet' : `${Math.round(b.precision * 100)}% real` }}</span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">Scoring also learns from these decisions: your recent replies and dismissals are shown to the scorer as examples.</p>
      </template>
    </div>

    <!-- Replies -->
    <SkeletonCards v-if="!results" :count="2" :lines="2" />
    <Empty v-else-if="!results.rows.length" class="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><MessageSquareReplyIcon /></EmptyMedia>
        <EmptyTitle>No replies yet</EmptyTitle>
        <EmptyDescription>Mark threads as replied in the inbox and paste your reply's link to track it here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child size="sm" variant="outline"><NuxtLink :to="`/app/${projectId}/inbox`">Open the inbox</NuxtLink></Button>
      </EmptyContent>
    </Empty>
    <div v-else class="overflow-hidden rounded-xl border bg-card shadow-xs/5">
      <div class="hidden grid-cols-[1fr_110px_70px_70px] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
        <div>Thread</div><div>Your reply</div><div class="text-right">Visits</div><div class="text-right">Sign-ups</div>
      </div>
      <div v-for="r in results.rows" :key="r.threadId" class="grid gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_110px_70px_70px] sm:items-center sm:gap-4">
        <div class="min-w-0">
          <a :href="r.url" target="_blank" rel="noopener" class="line-clamp-1 text-sm font-medium hover:underline">{{ r.title }}</a>
          <div class="text-xs text-muted-foreground">{{ r.channel ? `r/${r.channel}` : r.platform }} · replied {{ when(r.repliedAt) }}</div>
        </div>
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
</template>
