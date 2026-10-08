<script setup lang="ts">
const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

useSeoMeta({
  title: 'A GummySearch alternative for Reddit audience research · social-radar',
  description: 'GummySearch is closing on December 1. social-radar covers the same Reddit research and lead-finding workflow without the Reddit API, and you can self-host it.',
})

const rows = [
  { need: 'Pain points from Reddit conversations', how: 'Research clusters threads into pain points, each with the threads behind it.' },
  { need: 'Finding the right subreddits', how: 'The subreddit map ranks subs by how often your buyers show up and by their promotion rules.' },
  { need: 'Leads: people asking for a tool', how: 'New threads are scored for buying intent; the inbox shows the ones worth answering.' },
  { need: 'Keyword tracking', how: 'Keywords and competitors from your landing page are matched against every new thread, plus web search for older threads that still rank.' },
  { need: 'Posting without getting banned', how: 'Drafts are checked against each sub\'s rules, with cooldowns and a daily promo cap.' },
]
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14">
      <div class="flex flex-col gap-4">
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Moving off GummySearch?</h1>
        <p class="text-lg text-muted-foreground">
          GummySearch is closing on December 1. social-radar is an open-source tool for the same job: understanding what your audience says on Reddit and finding the threads where your product helps.
        </p>
        <p class="text-muted-foreground">
          It does not use the Reddit API. It reads public feeds gently and uses web search for discovery, so it does not depend on API access that can be withdrawn. You can use the hosted version or run it on your own Cloudflare account for free.
        </p>
        <LandingCta source="gummysearch" />
      </div>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">What you used it for, and where it lives here</h2>
        <div class="divide-y rounded-xl border">
          <div v-for="r in rows" :key="r.need" class="grid gap-1 p-4 sm:grid-cols-[220px_1fr] sm:gap-4">
            <div class="font-medium">{{ r.need }}</div>
            <div class="text-sm text-muted-foreground">{{ r.how }}</div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-xl font-semibold">What is different</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>No historical archive of all of Reddit: you get new threads in the subs you watch, plus older threads that still rank in search.</li>
          <li>It tells you what to do each day (a few threads to answer and one post idea) instead of a search box.</li>
          <li>It never posts, comments or messages for you.</li>
        </ul>
      </section>
    </main>
  </div>
</template>
