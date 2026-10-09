<script setup lang="ts">
import { ClockIcon, InboxIcon, MegaphoneIcon, SparklesIcon, TimerIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useLazyFetch(() => `/api/projects/${projectId.value}`)
const { data: today, refresh } = useLazyFetch(() => `/api/projects/${projectId.value}/today`)
useHead({ title: () => `Today · ${project.value?.name ?? 'Project'}` })

async function setStatus(threadId: string, status: string) {
  try {
    await $fetch(`/api/projects/${projectId.value}/threads/${encodeURIComponent(threadId)}`, { method: 'PATCH', body: { status } })
    await Promise.all([refresh(), refreshNuxtData('project-nav')])
  }
  catch {
    toast.error('Could not update the thread')
  }
}

const draftLink = computed(() => {
  const s = today.value?.suggestion
  if (!s) return null
  const query = new URLSearchParams({ subreddit: s.subreddit, angle: s.angle, promo: s.promo ? '1' : '0', ...(s.topic ? { topic: s.topic } : {}) })
  return `/app/${projectId.value}/drafts?${query}`
})

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
    <AppPageHeader :title="greeting" :description="`Your plan for ${project?.name ?? 'today'}: answer the best threads, then post if you have a slot.`" />

    <SkeletonStats v-if="!today" />
    <section v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="New threads"
        :value="today.newCount"
        :icon="InboxIcon"
        :tone="today.newCount ? 'good' : 'neutral'"
        :hint="today.newCount ? 'Worth answering, in your inbox' : 'Nothing new yet'"
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
        <h2 class="text-lg font-semibold tracking-tight">Answer these first</h2>
        <NuxtLink v-if="today && today.newCount > today.threads.length" :to="`/app/${projectId}/inbox`" class="text-sm text-muted-foreground hover:text-foreground">
          All {{ today.newCount }} in Inbox →
        </NuxtLink>
      </div>
      <SkeletonThreads v-if="!today" :count="2" />
      <Empty v-else-if="!today.threads.length" class="rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon"><InboxIcon /></EmptyMedia>
          <EmptyTitle>Nothing to answer right now</EmptyTitle>
          <EmptyDescription>
            <template v-if="today?.pendingScoring">{{ today.pendingScoring }} threads are waiting to be scored. Check back in a few minutes.</template>
            <template v-else>Watch more subreddits to widen the net. New threads arrive every 15 minutes.</template>
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent v-if="!today?.pendingScoring">
          <Button as-child size="sm" variant="outline"><NuxtLink :to="`/app/${projectId}/subreddits`">Find subreddits</NuxtLink></Button>
        </EmptyContent>
      </Empty>
      <ThreadCard v-for="t in today?.threads" :key="t.id" :thread="t" @status="next => setStatus(t.id, next)" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold tracking-tight">Post idea</h2>
      <Skeleton v-if="!today" class="h-24 w-full rounded-xl" />
      <div v-else-if="today.suggestion" class="flex flex-col gap-4 rounded-xl border bg-gradient-to-br from-amber-50 to-background p-5 shadow-xs/5 sm:flex-row sm:items-center dark:from-amber-500/5">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/14 text-amber-700 dark:text-amber-400"><SparklesIcon class="size-5" /></span>
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
      <Empty v-else class="rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SparklesIcon /></EmptyMedia>
          <EmptyTitle>No post idea yet</EmptyTitle>
          <EmptyDescription>Watch a subreddit and we'll suggest what to post there, and when.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  </div>
</template>
