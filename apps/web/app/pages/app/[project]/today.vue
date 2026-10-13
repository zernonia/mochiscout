<script setup lang="ts">
import { ClockIcon, InboxIcon, LightbulbIcon, MegaphoneIcon, MessageCircleHeartIcon, TimerIcon } from '@lucide/vue'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: today } = useCachedFetch(() => `/api/projects/${projectId.value}/today`, { deep: true })
useHead({ title: () => `Today · ${project.value?.name ?? 'Project'}` })

// Threads here are all new: reply, save or dismiss takes them off the list.
const changeStatus = useThreadStatus(projectId)
function setStatus(thread: NonNullable<typeof today.value>['threads'][number], next: ThreadStatus, dismissReason?: string) {
  if (today.value) changeStatus({ list: today.value.threads, thread, from: 'new', to: next, reason: dismissReason })
}

const draftLink = computed(() => {
  const s = today.value?.suggestion
  if (!s) return null
  const query = new URLSearchParams({ subreddit: s.subreddit, angle: s.angle, promo: s.promo ? '1' : '0', ...(s.topic ? { topic: s.topic } : {}) })
  return `/app/${projectId.value}/drafts?${query}`
})

const { user } = useUserSession()
const firstName = computed(() => user.value?.name?.split(/\s+/)[0] ?? '')
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})

function day(d: string | Date) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function time(d: string | Date) {
  return new Date(d).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Greeting -->
    <section class="relative overflow-hidden rounded-3xl border border-brand/10 bg-gradient-to-br from-brand-soft via-background to-background px-5 py-6 sm:px-8 sm:py-8">
      <div class="relative z-10 flex max-w-xl flex-col gap-2">
        <p class="text-sm font-medium text-brand-foreground">{{ project?.name ?? 'Today' }}</p>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ greeting }}{{ firstName ? `, ${firstName}` : '' }}</h1>
        <p class="text-sm text-pretty text-muted-foreground sm:text-base">
          <template v-if="!today">Getting today's plan ready…</template>
          <template v-else-if="today.newCount">{{ today.newCount }} thread{{ today.newCount === 1 ? '' : 's' }} worth answering{{ today.pacing.nextPromoAt ? '' : ', and a promo slot open' }}. Start with the ones below.</template>
          <template v-else>Nothing new to answer yet. {{ today.pendingScoring ? `${today.pendingScoring} threads are being scored.` : 'New threads arrive every 15 minutes.' }}</template>
        </p>
      </div>
      <LandingMochiMascot class="pointer-events-none absolute -right-2 -bottom-3 h-24 w-36 opacity-95 sm:right-6 sm:bottom-1 sm:h-32 sm:w-44" />
    </section>
    <ClientOnly><GettingStarted :project-id="projectId" /></ClientOnly>

    <SkeletonStats v-if="!today" />
    <section v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="New threads"
        :value="today.newCount"
        :icon="InboxIcon"
        tone="brand"
        :trend="today.trend"
        :hint="today.trend.some(n => n) ? `${today.trend.reduce((a, n) => a + n, 0)} found this week` : 'Nothing new yet'"
        :to="`/app/${projectId}/inbox`"
      />
      <StatTile
        label="Being scored"
        :value="today.pendingScoring"
        :icon="TimerIcon"
        :tone="today.pendingScoring ? 'info' : 'neutral'"
        :hint="today.pendingScoring ? 'Scored every 15 minutes' : 'All caught up'"
      />
      <StatTile
        label="Promo posts today"
        :value="`${today.pacing.promoToday}/${today.pacing.promoLimit}`"
        :icon="MegaphoneIcon"
        :tone="today.pacing.nextPromoAt ? 'warn' : 'good'"
        :hint="today.pacing.nextPromoAt ? `Next slot ${time(today.pacing.nextPromoAt)}` : 'You can post one today'"
      />
      <StatTile
        label="Cooldowns"
        :value="today.pacing.cooldowns.length"
        :icon="ClockIcon"
        :tone="today.pacing.cooldowns.length ? 'warn' : 'good'"
      >
        <template v-if="today.pacing.cooldowns.length">
          {{ today.pacing.cooldowns.map(c => `r/${c.subreddit} until ${day(c.until)}`).join(', ') }}
        </template>
        <template v-else>All watched subs are open</template>
      </StatTile>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="flex items-center gap-2 text-lg font-semibold tracking-tight"><MessageCircleHeartIcon class="size-5 text-brand" /> Answer these first</h2>
        <NuxtLink v-if="today && today.newCount > today.threads.length" :to="`/app/${projectId}/inbox`" class="text-sm text-muted-foreground hover:text-foreground">
          All {{ today.newCount }} in Inbox →
        </NuxtLink>
      </div>
      <SkeletonThreads v-if="!today" :count="2" />
      <AppEmpty
        v-else-if="!today.threads.length"
        title="Nothing to answer right now"
        :description="today.pendingScoring ? `${today.pendingScoring} threads are waiting to be scored. Check back in a few minutes.` : 'Watch more subreddits to widen the net. New threads arrive every 15 minutes.'"
      >
        <Button v-if="!today.pendingScoring" as-child size="sm" variant="outline"><NuxtLink :to="`/app/${projectId}/subreddits`">Find subreddits</NuxtLink></Button>
      </AppEmpty>
      <TransitionGroup
        tag="div"
        class="relative flex flex-col gap-3"
        move-class="transition-transform duration-300 ease-out"
        leave-active-class="absolute inset-x-0 transition duration-200 ease-in"
        leave-to-class="translate-x-8 opacity-0"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
      >
        <ThreadCard v-for="t in today?.threads" :key="t.id" :project-id="projectId" :thread="t" @status="(next, reason) => setStatus(t, next, reason)" />
      </TransitionGroup>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="flex items-center gap-2 text-lg font-semibold tracking-tight"><LightbulbIcon class="size-5 text-amber-500" /> Post idea</h2>
      <Skeleton v-if="!today" class="h-24 w-full rounded-2xl" />
      <div v-else-if="today.suggestion" class="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-amber-50/80 via-card to-card p-5 shadow-xs/5 sm:flex-row sm:items-center">
        <SourceAvatar :channel="today.suggestion.subreddit" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <p>
            A <span class="font-medium">{{ today.suggestion.angle }}</span>
            <template v-if="today.suggestion.topic"> about <span class="font-medium">"{{ today.suggestion.topic }}"</span></template>
            in <span class="font-medium">r/{{ today.suggestion.subreddit }}</span>{{ today.suggestion.promo ? '' : ', without mentioning the product' }}.
          </p>
          <p class="text-sm text-muted-foreground">{{ today.suggestion.why }}</p>
        </div>
        <Button v-if="draftLink" as-child class="shrink-0">
          <NuxtLink :to="draftLink">Draft it</NuxtLink>
        </Button>
      </div>
      <AppEmpty v-else title="No post idea yet" description="Watch a subreddit and we'll suggest what to post there, and when." />
    </section>
  </div>
</template>
