<script setup lang="ts">
import { COMPETITORS } from '#shared/competitors'
import { ArrowRightIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

useMarketingSeo({
  title: 'Reddit lead generation tools compared: Mochiscout alternatives',
  description: 'How Mochiscout compares with GummySearch, Brand24, F5Bot, Syften, Octolens, RedShip, Redreach, Bazzly, ReplyGuy, Pulse, KWatch.io and others for finding customers on Reddit, Hacker News, Bluesky and X.',
  path: '/alternatives',
})
useJsonLd({
  '@type': 'ItemList',
  'name': 'Mochiscout comparisons',
  'itemListElement': COMPETITORS.map((c, i) => ({ '@type': 'ListItem', 'position': i + 1, 'url': `${site.url}/alternatives/${c.slug}`, 'name': `Mochiscout vs ${c.name}` })),
})
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-4xl flex-col gap-10 px-4 pt-16 pb-24 sm:pt-20">
      <div class="flex flex-col gap-4">
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">How Mochiscout compares</h1>
        <p class="max-w-2xl text-lg text-muted-foreground">
          Honest comparisons with the tools founders use to find customers on Reddit and beyond: what each does well, where Mochiscout is different, and when the other tool is the better pick.
        </p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="c in COMPETITORS"
          :key="c.slug"
          :to="`/alternatives/${c.slug}`"
          class="group flex flex-col gap-2 rounded-2xl border p-5 transition-colors hover:bg-muted/40"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Mochiscout vs {{ c.name }}</h2>
            <ArrowRightIcon class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p class="text-sm text-muted-foreground">{{ c.theirPitch }}</p>
          <span v-if="c.notice" class="w-fit rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-800">Shutting down Dec 1, 2026</span>
        </NuxtLink>
      </div>
    </main>
    <LandingFooter />
  </div>
</template>
