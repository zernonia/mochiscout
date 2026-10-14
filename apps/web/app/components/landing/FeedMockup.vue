<script setup lang="ts">
// Illustrative inbox for a made-up product ("Shipnote", a changelog tool). Not real users.
const posts = [
  {
    source: 'reddit' as const,
    where: 'r/SaaS',
    who: 'u/two_person_saas',
    ago: '38m',
    title: 'Simple changelog tool that also emails users?',
    body: 'We ship weekly and nobody notices. I want a public changelog page and an email when something ships. Beamer feels like overkill for two people.',
    kind: 'Looking for a tool',
    intent: 92,
    angle: 'Share how you announce weekly releases; mention the email digest only if asked.',
  },
  {
    source: 'hn' as const,
    where: 'Ask HN',
    who: 'quietbuilder',
    ago: '2h',
    title: 'Ask HN: How do you tell users what shipped?',
    body: 'Release notes live in Notion, then get copied to the blog, then to Twitter. It takes an afternoon every time.',
    kind: 'Asking for advice',
    intent: 78,
    angle: 'Describe a one-source-of-truth workflow; Shipnote fits as one option.',
  },
  {
    source: 'bluesky' as const,
    where: 'Bluesky',
    who: '@mara.builds',
    ago: '5h',
    title: '',
    body: 'Our changelog widget just doubled in price. Anyone moved off it to something lighter?',
    kind: 'Competitor pain',
    intent: 85,
    angle: 'Compare migration effort honestly; offer the import guide.',
  },
]

const kindClass: Record<string, string> = {
  'Looking for a tool': 'bg-emerald-500',
  'Asking for advice': 'bg-sky-500',
  'Competitor pain': 'bg-orange-500',
}

const nav = [
  { label: 'Today', count: 3, active: true },
  { label: 'Inbox', count: 12 },
  { label: 'Subreddits' },
  { label: 'Drafts', count: 1 },
  { label: 'Tracker' },
]
</script>

<template>
  <div class="overflow-hidden rounded-2xl border bg-background text-left shadow-xl shadow-black/5">
    <div class="flex items-center gap-1.5 border-b px-4 py-2.5">
      <span class="size-2.5 rounded-full bg-neutral-200" />
      <span class="size-2.5 rounded-full bg-neutral-200" />
      <span class="size-2.5 rounded-full bg-neutral-200" />
      <span class="ms-3 truncate rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">mochiscout.com/app/shipnote/today</span>
    </div>
    <div class="flex">
      <aside class="hidden w-48 shrink-0 flex-col gap-1 border-e p-3 text-sm md:flex">
        <div class="mb-3 flex items-center gap-2 px-2">
          <span class="flex size-7 items-center justify-center rounded-md bg-neutral-900 text-xs font-semibold text-white">S</span>
          <div class="leading-tight">
            <div class="font-medium">Shipnote</div>
            <div class="text-[11px] text-muted-foreground">shipnote.app</div>
          </div>
        </div>
        <div
          v-for="n in nav"
          :key="n.label"
          class="flex items-center justify-between rounded-md px-2 py-1.5"
          :class="n.active ? 'bg-muted font-medium' : 'text-muted-foreground'"
        >
          {{ n.label }}
          <span v-if="n.count" class="text-xs tabular-nums text-muted-foreground">{{ n.count }}</span>
        </div>
      </aside>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div>
            <div class="text-sm font-semibold">Today</div>
            <div class="text-xs text-muted-foreground">3 threads worth answering · 1 post idea</div>
          </div>
          <span class="hidden rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground sm:inline">Reddit · HN · Bluesky</span>
        </div>
        <ul class="divide-y">
          <li v-for="p in posts" :key="p.who" class="flex gap-3 px-4 py-4 sm:px-5">
            <LandingSourceBadge :source="p.source" size="sm" class="mt-0.5" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span class="font-medium text-foreground">{{ p.where }}</span>
                <span>{{ p.who }}</span>
                <span>· {{ p.ago }}</span>
              </div>
              <div v-if="p.title" class="text-sm font-medium">{{ p.title }}</div>
              <p class="text-sm text-muted-foreground">{{ p.body }}</p>
              <div class="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                <span class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                  <span class="size-1.5 rounded-full" :class="kindClass[p.kind]" />{{ p.kind }}
                </span>
                <span class="tabular-nums text-muted-foreground">Intent {{ p.intent }}</span>
              </div>
              <p class="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <span class="font-medium text-foreground">Angle:</span> {{ p.angle }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
