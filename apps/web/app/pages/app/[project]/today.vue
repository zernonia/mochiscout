<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = await useFetch(() => `/api/projects/${projectId.value}`)
const { data: today, refresh } = await useFetch(() => `/api/projects/${projectId.value}/today`)
useHead({ title: () => `Today · ${project.value?.name ?? 'Project'}` })

async function setStatus(threadId: string, status: string) {
  try {
    await $fetch(`/api/projects/${projectId.value}/threads/${encodeURIComponent(threadId)}`, { method: 'PATCH', body: { status } })
    await refresh()
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

function day(d: string | Date) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function time(d: string | Date) {
  return new Date(d).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <ProjectNav :project-id="projectId" :name="project?.name" />

    <section v-if="today" class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border p-4">
        <div class="text-sm text-muted-foreground">Promo posts today</div>
        <div class="mt-1 text-2xl font-semibold tabular-nums">{{ today.pacing.promoToday }}/{{ today.pacing.promoLimit }}</div>
        <div class="mt-1 text-xs text-muted-foreground">
          <template v-if="today.pacing.nextPromoAt">Next promo post after {{ time(today.pacing.nextPromoAt) }}</template>
          <template v-else>You can make a promo post today.</template>
        </div>
      </div>
      <div class="rounded-xl border p-4">
        <div class="text-sm text-muted-foreground">Cooldowns</div>
        <div v-if="!today.pacing.cooldowns.length" class="mt-1 text-sm">None. All watched subs are open.</div>
        <ul v-else class="mt-1 flex flex-col gap-0.5 text-sm">
          <li v-for="c in today.pacing.cooldowns" :key="c.subreddit">r/{{ c.subreddit }} until {{ day(c.until) }}</li>
        </ul>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="font-semibold">Answer these</h2>
        <NuxtLink v-if="today && today.newCount > today.threads.length" :to="`/app/${projectId}/inbox`" class="text-sm text-muted-foreground underline">
          All {{ today.newCount }} in Inbox
        </NuxtLink>
      </div>
      <div v-if="!today?.threads.length" class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing to answer right now.
        <template v-if="today?.pendingScoring">{{ today.pendingScoring }} threads are waiting for scoring.</template>
        <template v-else>Watch more <NuxtLink :to="`/app/${projectId}/subreddits`" class="underline">subreddits</NuxtLink> to widen the net.</template>
      </div>
      <ThreadCard v-for="t in today?.threads" :key="t.id" :thread="t" @status="next => setStatus(t.id, next)" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-semibold">Post idea</h2>
      <div v-if="today?.suggestion" class="flex flex-col gap-3 rounded-xl border p-4">
        <p>
          A <span class="font-medium">{{ today.suggestion.angle }}</span>
          <template v-if="today.suggestion.topic"> about <span class="font-medium">"{{ today.suggestion.topic }}"</span></template>
          in <span class="font-medium">r/{{ today.suggestion.subreddit }}</span>{{ today.suggestion.promo ? '' : ', without mentioning the product' }}.
        </p>
        <p class="text-sm text-muted-foreground">{{ today.suggestion.why }}</p>
        <Button v-if="draftLink" as-child size="sm" class="self-start">
          <NuxtLink :to="draftLink">Draft it</NuxtLink>
        </Button>
      </div>
      <div v-else class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Watch a subreddit to get post ideas.
      </div>
    </section>
  </div>
</template>
