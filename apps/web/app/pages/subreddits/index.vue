<script setup lang="ts">
const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

const { data: subs } = await useFetch('/api/public/subreddits')
useMarketingSeo({
  title: 'Subreddit self-promotion rules: where you can promote your product',
  description: 'Which subreddits allow self-promotion, how strict their moderators are, and how many people ask for tools there, from pooled Mochiscout data.',
  path: '/subreddits',
})

const gradeClass: Record<string, string> = {
  friendly: 'bg-emerald-500/12 text-emerald-800',
  careful: 'bg-amber-500/14 text-amber-900',
  strict: 'bg-red-500/12 text-red-800',
  unknown: 'bg-muted text-muted-foreground',
}
const gradeLabel: Record<string, string> = { friendly: 'Promotion-friendly', careful: 'Promote carefully', strict: 'Strict', unknown: 'Not enough data' }
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-16 pb-24 sm:pt-20">
      <div class="flex flex-col gap-3">
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Where can you promote your product on Reddit?</h1>
        <p class="max-w-2xl text-lg text-muted-foreground">Each subreddit's self-promotion rules, how often moderators remove posts, and how many people there ask for tools. Pooled, anonymous data from the posts Mochiscout checks.</p>
      </div>
      <div v-if="subs?.length" class="divide-y rounded-xl border">
        <NuxtLink v-for="s in subs" :key="s.name" :to="`/subreddits/${s.name}`" class="flex flex-col gap-1 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
          <div class="min-w-0 flex-1">
            <div class="font-medium">r/{{ s.name }}</div>
            <p v-if="s.description" class="line-clamp-1 text-sm text-muted-foreground">{{ s.description }}</p>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <span class="tabular-nums">{{ s.buyingPosts30d }} buying posts / 30d</span>
            <span class="rounded-full px-2 py-0.5 font-medium" :class="gradeClass[s.grade]">{{ gradeLabel[s.grade] }}</span>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Subreddit pages appear here as Mochiscout gathers enough data about each community.</p>
    </main>
    <LandingFooter />
  </div>
</template>
