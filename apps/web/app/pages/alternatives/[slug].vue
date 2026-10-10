<script setup lang="ts">
import { COMPETITORS, FEATURES, findCompetitor, MOCHISCOUT } from '#shared/competitors'
import { ExternalLinkIcon, InfoIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

const route = useRoute()
const found = findCompetitor(String(route.params.slug))
if (!found) throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
const c = found

const path = `/alternatives/${c.slug}`
useMarketingSeo({ title: c.title, description: c.description, path, type: 'article' })

const verified = new Date(`${c.verified}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const others = COMPETITORS.filter(o => o.slug !== c.slug)

useJsonLd([
  {
    '@type': 'WebPage',
    'name': c.title,
    'url': `${site.url}${path}`,
    'description': c.description,
    'dateModified': c.verified,
    'publisher': { '@type': 'Organization', 'name': site.operator, 'url': site.url },
  },
  {
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Mochiscout', 'item': site.url },
      { '@type': 'ListItem', 'position': 2, 'name': 'Alternatives', 'item': `${site.url}/alternatives` },
      { '@type': 'ListItem', 'position': 3, 'name': `${c.name} alternative`, 'item': `${site.url}${path}` },
    ],
  },
  ...(c.faq.length
    ? [{
        '@type': 'FAQPage',
        'mainEntity': c.faq.map(f => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })),
      }]
    : []),
])
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-4xl flex-col gap-14 px-4 pt-16 pb-24 sm:pt-20">
      <!-- Hero -->
      <section class="flex flex-col gap-5">
        <nav class="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <NuxtLink to="/alternatives" class="hover:text-foreground">Alternatives</NuxtLink>
          <span class="mx-1.5">/</span>
          <span>{{ c.name }}</span>
        </nav>
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{{ c.h1 }}</h1>
        <div v-if="c.notice" class="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
          <InfoIcon class="mt-0.5 size-4 shrink-0 text-amber-700" />
          <p>{{ c.notice }}</p>
        </div>
        <p class="max-w-3xl text-pretty text-lg text-muted-foreground">{{ c.intro }}</p>
        <LandingCta :source="`alt-${c.slug}`" secondary="selfhost" class="justify-start" />
      </section>

      <!-- Table -->
      <section class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-2xl font-semibold tracking-tight">Mochiscout vs {{ c.name }} at a glance</h2>
          <p class="text-sm text-muted-foreground">{{ c.name }}: {{ c.theirPitch }}</p>
        </div>
        <div class="overflow-hidden rounded-xl border">
          <div class="hidden grid-cols-[1fr_1.2fr_1.2fr] gap-4 border-b bg-muted/40 px-4 py-3 text-sm font-medium sm:grid">
            <div />
            <div>Mochiscout</div>
            <div>{{ c.name }}</div>
          </div>
          <div v-for="f in FEATURES" :key="f.key" class="grid gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_1.2fr_1.2fr] sm:gap-4">
            <div class="text-sm font-medium">{{ f.label }}</div>
            <div class="flex items-start gap-2"><span class="w-20 shrink-0 text-xs text-muted-foreground sm:hidden">Mochiscout</span><LandingCompareMark :cell="MOCHISCOUT[f.key]" /></div>
            <div class="flex items-start gap-2"><span class="w-20 shrink-0 text-xs text-muted-foreground sm:hidden">{{ c.name }}</span><LandingCompareMark :cell="c.cells[f.key]" /></div>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">{{ c.name }} details checked on its website on {{ verified }}. Spot something out of date? Email <a :href="`mailto:${site.supportEmail}`" class="underline">{{ site.supportEmail }}</a> and we'll fix it.</p>
      </section>

      <!-- Mapping -->
      <section v-if="c.mapping" class="flex flex-col gap-4">
        <h2 class="text-2xl font-semibold tracking-tight">What you used {{ c.name }} for, and where it lives in Mochiscout</h2>
        <div class="divide-y rounded-xl border">
          <div v-for="m in c.mapping" :key="m.need" class="grid gap-1 p-4 sm:grid-cols-[240px_1fr] sm:gap-4">
            <div class="font-medium">{{ m.need }}</div>
            <div class="text-sm text-muted-foreground">{{ m.how }}</div>
          </div>
        </div>
      </section>

      <!-- Differences -->
      <section class="flex flex-col gap-6">
        <h2 class="text-2xl font-semibold tracking-tight">Why people choose Mochiscout over {{ c.name }}</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="d in c.differences" :key="d.title" class="flex flex-col gap-2 rounded-2xl border p-5">
            <h3 class="font-semibold">{{ d.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ d.body }}</p>
          </div>
        </div>
        <div class="rounded-2xl bg-muted/50 p-5">
          <h3 class="font-semibold">When {{ c.name }} is the better pick</h3>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li v-for="r in c.chooseThemIf" :key="r">{{ r }}</li>
          </ul>
        </div>
      </section>

      <!-- FAQ -->
      <section v-if="c.faq.length" class="flex flex-col gap-4">
        <h2 class="text-2xl font-semibold tracking-tight">Questions</h2>
        <Accordion type="single" collapsible>
          <AccordionItem v-for="f in c.faq" :key="f.q" :value="f.q">
            <AccordionTrigger>{{ f.q }}</AccordionTrigger>
            <AccordionContent><p class="text-muted-foreground">{{ f.a }}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <!-- CTA -->
      <section class="flex flex-col items-center gap-5 rounded-3xl bg-neutral-100 px-6 py-12 text-center">
        <LandingMochiMascot class="h-16 w-24" />
        <h2 class="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Someone asked for your product today.</h2>
        <p class="max-w-xl text-muted-foreground">Paste your URL and see the threads worth answering in about five minutes. Free plan, no card.</p>
        <LandingCta :source="`alt-${c.slug}-footer`" />
      </section>

      <!-- Sources and more comparisons -->
      <section class="grid gap-8 border-t pt-10 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <h2 class="text-sm font-semibold">Sources</h2>
          <ul class="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li v-for="s in c.sources" :key="s.url">
              <a :href="s.url" target="_blank" rel="noopener nofollow" class="inline-flex items-center gap-1 hover:text-foreground">{{ s.label }} <ExternalLinkIcon class="size-3" /></a>
            </li>
          </ul>
        </div>
        <div class="flex flex-col gap-2">
          <h2 class="text-sm font-semibold">More comparisons</h2>
          <ul class="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li v-for="o in others" :key="o.slug"><NuxtLink :to="`/alternatives/${o.slug}`" class="hover:text-foreground">Mochiscout vs {{ o.name }}</NuxtLink></li>
          </ul>
        </div>
      </section>
    </main>
    <LandingFooter />
  </div>
</template>
