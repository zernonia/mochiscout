<script setup lang="ts">
const { edition } = useRuntimeConfig().public

// Self-hosted instances have no marketing page.
if (edition !== 'cloud') {
  const { loggedIn } = useUserSession()
  await navigateTo(loggedIn.value ? '/app' : '/login', { replace: true })
}

const { data: catalogue } = await useFetch('/api/billing/plans', { immediate: edition === 'cloud' })

useSeoMeta({
  title: 'social-radar · Find the people who need your product on Reddit',
  description: 'Mine Reddit for the pain points your buyers talk about, watch the subreddits they use for buying-intent threads, and post without getting banned. Open source.',
  ogTitle: 'social-radar',
  ogDescription: 'Research → Map → Watch → Draft → Track. A daily 10-minute plan for showing up helpfully on Reddit.',
})

const steps = [
  { title: 'Research', body: 'Paste your URL. We learn who buys it, then cluster what those people complain about on Reddit into pain points with real threads as evidence.' },
  { title: 'Map', body: 'See which subreddits your buyers gather in, how well each fits, and each sub\'s promotion rules before you post.' },
  { title: 'Watch', body: 'New threads in those subs are scored for buying intent. Your inbox only shows the ones worth answering, with a suggested angle.' },
  { title: 'Draft', body: 'Write posts with the sub\'s rules checked as you go: links, format, karma and account age, cooldowns and tone.' },
  { title: 'Track', body: 'Paste what you posted. We check it stays up and that your account isn\'t shadowbanned.' },
]

const principles = [
  { title: 'You post. Always.', body: 'No auto-posting, auto-commenting, DMs or votes. No throwaway accounts. Replies are never written for you: you get the thread and an angle.' },
  { title: 'No Reddit API', body: 'Public feeds, read gently and cached per subreddit, plus web search for discovery. Nothing that can be switched off overnight.' },
  { title: 'Open source', body: 'AGPL-licensed. Run it free on your own Cloudflare account, or let us host it.' },
]

const faqs = [
  { q: 'Will this get my account banned?', a: 'It is built to prevent that. Every draft is checked against the subreddit\'s rules, promo posts are rate-limited per sub and per day, and nothing is ever posted for you.' },
  { q: 'Is there a free plan?', a: 'Yes: one project, three watched subreddits and a weekly digest. Self-hosting is free with no limits.' },
  { q: 'Does it work for B2C as well as SaaS?', a: 'Yes. Anything people discuss on Reddit works: tools, apps, services, ecommerce.' },
  { q: 'Which other sites are covered?', a: 'Reddit first. Hacker News and Bluesky are on paid plans; X is on Pro.' },
]
</script>

<template>
  <div v-if="edition === 'cloud'" class="min-h-dvh">
    <LandingHeader />

    <main>
      <section class="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
        <p class="rounded-full border px-3 py-1 text-xs text-muted-foreground">Open source · No Reddit API · You stay in control</p>
        <h1 class="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Find the people who need your product on Reddit.</h1>
        <p class="max-w-2xl text-lg text-muted-foreground">
          Learn what your buyers complain about, catch threads where someone is asking for a tool like yours, and post without breaking the rules. Ten minutes a day.
        </p>
        <LandingCta source="hero" />
      </section>

      <section class="border-y bg-muted/40">
        <div class="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="(s, i) in steps" :key="s.title" class="flex flex-col gap-2">
            <div class="text-xs text-muted-foreground tabular-nums">0{{ i + 1 }}</div>
            <h2 class="font-semibold">{{ s.title }}</h2>
            <p class="text-sm text-muted-foreground">{{ s.body }}</p>
          </div>
        </div>
      </section>

      <section class="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-3">
        <div v-for="p in principles" :key="p.title" class="flex flex-col gap-2">
          <h2 class="font-semibold">{{ p.title }}</h2>
          <p class="text-sm text-muted-foreground">{{ p.body }}</p>
        </div>
      </section>

      <section id="pricing" class="mx-auto flex max-w-5xl scroll-mt-16 flex-col gap-6 px-4 py-14">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p class="text-muted-foreground">Start free. Self-hosting is always free.</p>
        </div>
        <PlanCards v-if="catalogue" :plans="catalogue.plans" />
      </section>

      <section class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-14">
        <h2 class="text-2xl font-semibold tracking-tight">Questions</h2>
        <Accordion type="single" collapsible>
          <AccordionItem v-for="f in faqs" :key="f.q" :value="f.q">
            <AccordionTrigger>{{ f.q }}</AccordionTrigger>
            <AccordionContent><p class="text-muted-foreground">{{ f.a }}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section class="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 pb-24">
        <h2 class="text-2xl font-semibold tracking-tight">Start with one project.</h2>
        <LandingCta source="footer" />
      </section>
    </main>

    <footer class="border-t">
      <div class="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-6 text-sm text-muted-foreground">
        <span>social-radar</span>
        <NuxtLink to="/alternatives/gummysearch" class="hover:underline">GummySearch alternative</NuxtLink>
        <a href="https://github.com/zernonia/social-radar" target="_blank" rel="noopener" class="hover:underline">GitHub</a>
      </div>
    </footer>
  </div>
</template>
