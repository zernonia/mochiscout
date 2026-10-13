<script setup lang="ts">
import { FREE_TOOLS } from '#shared/tools'
import { ArrowRightIcon, RadarIcon, ShieldCheckIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

useMarketingSeo({
  title: 'Free Reddit marketing tools for founders',
  description: 'Free tools to find customers on Reddit: a lead finder for threads asking for what you sell, and a subreddit rules checker so your post doesn\'t get removed. No sign-up.',
  path: '/tools',
})
useJsonLd([{
  '@type': 'CollectionPage',
  'name': 'Free Reddit marketing tools',
  'url': `${site.url}/tools`,
  'hasPart': FREE_TOOLS.map(t => ({ '@type': 'WebApplication', 'name': t.name, 'url': `${site.url}/tools/${t.slug}` })),
}])
const icons = { 'reddit-lead-finder': RadarIcon, 'subreddit-rules': ShieldCheckIcon }
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-4xl flex-col gap-10 px-4 pt-16 pb-24 sm:pt-20">
      <div class="flex flex-col gap-3">
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Free tools for finding customers on Reddit</h1>
        <p class="max-w-2xl text-lg text-muted-foreground">No sign-up. The same data Mochiscout uses to find people asking for your product and to keep your replies inside each community's rules.</p>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NuxtLink v-for="t in FREE_TOOLS" :key="t.slug" :to="`/tools/${t.slug}`" class="group flex flex-col gap-3 rounded-2xl border p-6 transition-colors hover:bg-muted/40">
          <component :is="icons[t.slug]" class="size-6 text-brand" />
          <h2 class="text-lg font-semibold">{{ t.name }}</h2>
          <p class="text-sm text-muted-foreground">{{ t.tagline }}</p>
          <span class="mt-auto inline-flex items-center gap-1 text-sm font-medium">Open <ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-0.5" /></span>
        </NuxtLink>
      </div>
      <section class="flex flex-col items-center gap-5 rounded-3xl bg-neutral-100 px-6 py-12 text-center dark:bg-neutral-900">
        <h2 class="text-balance text-2xl font-semibold tracking-tight">Want this every 15 minutes, scored, with replies drafted?</h2>
        <p class="max-w-xl text-muted-foreground">Mochiscout watches Reddit, Hacker News, Bluesky and X for people asking for what you sell, checks each community's rules and drafts a reply you post yourself.</p>
        <LandingCta source="tools" />
      </section>
    </main>
    <LandingFooter />
  </div>
</template>
