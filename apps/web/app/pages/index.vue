<script setup lang="ts">
const { edition } = useRuntimeConfig().public

// Self-hosted instances have no marketing page.
if (edition !== 'cloud') {
  const { loggedIn } = useUserSession()
  await navigateTo(loggedIn.value ? '/app' : '/login', { replace: true })
}

const { data: catalogue } = await useFetch('/api/billing/plans', { immediate: edition === 'cloud' })

const seoDescription = 'Find customers on Reddit, Hacker News, Bluesky and X. Mochiscout scores every post for buying intent, flags archived threads, drafts a reply that fits the thread and the subreddit rules, and leaves posting to you. Free plan, open source.'
useMarketingSeo({
  title: 'Mochiscout: find customers on Reddit, Hacker News, Bluesky and X',
  description: seoDescription,
  path: '/',
})

const sources = ['reddit', 'hn', 'bluesky', 'x'] as const

const differentiators = [
  { title: 'Leads, not mentions', body: 'Every post gets a buying-intent score and a reason. Fresh, uncrowded threads rise to the top; archived, locked and removed ones are flagged so you never draft for a dead thread.' },
  { title: 'Replies that fit the thread', body: 'Drafts read the full post and the replies so far, say fairly how you differ from a competitor someone already suggested, and learn your voice from what you post.' },
  { title: 'Gets better as you use it', body: 'Reply, save or dismiss with a reason, and scoring learns what fits your product. Hot leads can email you within the hour.' },
  { title: 'Won\'t disappear on you', body: 'No Reddit Data API to lose, and the code is open source. If the hosted service ever changed, you could run your own copy.' },
]

const pains = [
  { title: 'Your launch post got removed.', body: 'Every subreddit has its own promo rules, and one wrong link costs you the post.' },
  { title: 'Searching eats your whole day.', body: 'Dozens of communities, four sites, and the good threads are buried under everything else.' },
  { title: 'You find the thread a week late.', body: 'By the time you see "anyone know a tool for this?", ten people have already answered.' },
]

const asks = [
  { source: 'reddit' as const, where: 'r/smallbusiness', text: 'Is there an invoicing app that chases late payments for me? I hate sending the "just following up" email.' },
  { source: 'hn' as const, where: 'Ask HN', text: 'What do you use to collect customer feedback without paying for a whole CX suite?' },
  { source: 'bluesky' as const, where: 'Bluesky', text: 'Looking for a calendar booking tool that doesn\'t cost $15 a seat. Small team, simple needs.' },
  { source: 'x' as const, where: 'X', text: 'Spent my whole Sunday stitching together a status page. Surely someone has built this properly?' },
]

const steps = [
  { title: 'Paste your URL', body: 'We read your page to learn what it does and who it\'s for, then suggest keywords, competitors and the communities your buyers use.' },
  { title: 'Open your feed', body: 'New posts from Reddit, Hacker News, Bluesky and X are scored for buying intent. Fresh, uncrowded ones rise to the top, archived ones are flagged, and hot leads can email you.' },
  { title: 'Reply in a click', body: 'Get an AI-drafted reply that has read the whole thread, edit it, then copy it in and post it yourself. It learns your voice and what you care about from what you reply to and dismiss.' },
]

const principles = [
  { title: 'You post. Always.', body: 'No auto-posting, auto-commenting, votes or DMs. Mochiscout finds the thread and drafts a reply; you edit it and post it from your own account.' },
  { title: 'Rules first', body: 'Each subreddit\'s promotion rules, karma and account-age limits are checked before you post, with per-sub cooldowns and a daily promo cap.' },
  { title: 'Open source', body: 'AGPL-licensed. Run it free on your own Cloudflare account, or let us host it for you.' },
]

const faqs = [
  { q: 'Will this get my account banned?', a: 'It is built to prevent that. Every draft is checked against the subreddit\'s rules, promotional posts are rate-limited per community and per day, and nothing is ever posted for you.' },
  { q: 'Does Mochiscout post for me?', a: 'No. It never posts, comments, votes or sends messages. You copy the reply and post it yourself, so it stays in your voice.' },
  { q: 'Which sites are covered?', a: 'Reddit on every plan. Hacker News and Bluesky on Solo and Pro, and X on Pro.' },
  { q: 'Is there a free plan?', a: 'Yes. Every new account gets 14 days of Pro free, no card. After that you keep a free plan with one project, three watched subreddits and a weekly digest, or pick Solo or Pro. Self-hosting is free with no limits.' },
  { q: 'I used GummySearch. Is this a replacement?', a: 'For finding customers, yes. GummySearch shuts down on December 1, 2026. Mochiscout finds the threads where people ask for what you sell, on Reddit and three other sites, without the Reddit Data API that GummySearch lost.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Plans are monthly and you can cancel from the billing page; you keep access until the end of the paid period.' },
]

useJsonLd([
  {
    '@type': 'SoftwareApplication',
    'name': site.name,
    'url': site.url,
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web',
    'description': seoDescription,
    'offers': [
      { '@type': 'Offer', 'name': 'Free', 'price': '0', 'priceCurrency': 'USD' },
      { '@type': 'Offer', 'name': 'Solo', 'price': '19', 'priceCurrency': 'USD' },
      { '@type': 'Offer', 'name': 'Pro', 'price': '49', 'priceCurrency': 'USD' },
    ],
  },
  { '@type': 'Organization', 'name': site.name, 'url': site.url, 'logo': `${site.url}/apple-touch-icon.png`, 'email': site.supportEmail, 'sameAs': [site.repo] },
  {
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })),
  },
])
</script>

<template>
  <div v-if="edition === 'cloud'" class="min-h-dvh">
    <LandingHeader />

    <main>
      <!-- Hero -->
      <section class="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 pt-20 pb-12 text-center sm:pt-28">
        <NuxtLink to="/alternatives/gummysearch" class="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground shadow-xs/5 transition-colors hover:text-foreground">
          <span class="size-1.5 rounded-full bg-amber-500" />
          GummySearch shuts down Dec 1. Moving over? <span class="font-medium text-foreground">See how we compare →</span>
        </NuxtLink>
        <h1 class="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Find the people already asking for your product.
        </h1>
        <p class="max-w-2xl text-balance text-lg text-muted-foreground">
          Mochiscout watches Reddit, Hacker News, Bluesky and X for posts from people who need what you built. You reply yourself, by each community's rules.
        </p>
        <LandingCta source="hero" />
        <div class="flex items-center gap-3 text-sm text-muted-foreground">
          Posts from
          <span class="flex -space-x-1.5">
            <LandingSourceBadge v-for="s in sources" :key="s" :source="s" />
          </span>
        </div>
      </section>

      <!-- Product mockup -->
      <section class="mx-auto max-w-6xl px-3 sm:px-4">
        <div class="relative rounded-3xl bg-neutral-100 px-3 pt-10 pb-0 sm:px-10 sm:pt-14">
          <LandingMochiMascot class="absolute -top-8 right-6 h-16 w-24 sm:right-12 sm:h-20 sm:w-28" />
          <div class="mx-auto max-w-4xl translate-y-0 pb-3 sm:pb-10">
            <LandingFeedMockup />
          </div>
        </div>
      </section>

      <!-- Problem -->
      <section class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-24">
        <h2 class="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">You built it. You launched it. It went quiet.</h2>
        <div class="grid gap-4 md:grid-cols-3">
          <div v-for="(p, i) in pains" :key="p.title" class="flex flex-col gap-3 rounded-2xl border p-5">
            <div v-if="i === 0" class="rounded-xl bg-muted/60 p-3 text-xs">
              <div class="flex items-center gap-1.5 text-muted-foreground">
                <LandingSourceBadge source="reddit" size="sm" /> r/SideProject · 2h
              </div>
              <div class="mt-1.5 font-medium">I launched my app after 6 months 🚀</div>
              <div class="mt-1 italic text-muted-foreground">[ Removed by moderator ]</div>
            </div>
            <div v-else-if="i === 1" class="flex flex-wrap gap-1.5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              <span v-for="t in ['r/SaaS', 'r/startups', 'r/Entrepreneur', 'r/smallbusiness', 'Ask HN', 'Bluesky', 'X search', '+ 23 tabs']" :key="t" class="rounded-full border bg-background px-2 py-0.5">{{ t }}</span>
            </div>
            <div v-else class="rounded-xl bg-muted/60 p-3 text-xs">
              <div class="font-medium">"Anyone know a tool for this?"</div>
              <div class="mt-1 text-muted-foreground">Posted 8 days ago · 41 replies</div>
            </div>
            <h3 class="font-semibold">{{ p.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ p.body }}</p>
          </div>
        </div>
      </section>

      <!-- They are asking -->
      <section class="bg-neutral-50">
        <div class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-24">
          <div class="flex max-w-2xl flex-col gap-3">
            <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Your customers are already posting.</h2>
            <p class="text-muted-foreground">People describe their problem in public every day, often naming the tool they're unhappy with. These are the kinds of posts Mochiscout surfaces.</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <figure v-for="a in asks" :key="a.text" class="flex flex-col gap-3 rounded-2xl border bg-background p-5">
              <figcaption class="flex items-center gap-2 text-xs text-muted-foreground">
                <LandingSourceBadge :source="a.source" size="sm" /> {{ a.where }}
              </figcaption>
              <blockquote class="text-pretty">"{{ a.text }}"</blockquote>
            </figure>
          </div>
        </div>
      </section>

      <!-- Why Mochiscout -->
      <section class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-24">
        <div class="flex max-w-2xl flex-col gap-3">
          <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">More than keyword alerts.</h2>
          <p class="text-muted-foreground">Alert tools tell you a word appeared. Mochiscout tells you who is ready to buy, whether you can still reply, and what to say.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="d in differentiators" :key="d.title" class="flex flex-col gap-2 rounded-2xl border p-5">
            <h3 class="font-semibold">{{ d.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ d.body }}</p>
          </div>
        </div>
        <NuxtLink to="/alternatives" class="w-fit text-sm font-medium underline-offset-4 hover:underline">Compare with GummySearch, Brand24, F5Bot, Syften and others →</NuxtLink>
      </section>

      <!-- How it works -->
      <section class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-24">
        <div class="flex max-w-2xl flex-col gap-3">
          <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Three steps. Ten minutes a day.</h2>
          <p class="text-muted-foreground">Set up once, then check your feed with your morning coffee. A daily email brings the best threads to you.</p>
        </div>
        <ol class="grid gap-4 md:grid-cols-3">
          <li v-for="(s, i) in steps" :key="s.title" class="flex flex-col gap-3 rounded-2xl border p-5">
            <span class="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white tabular-nums">{{ i + 1 }}</span>
            <h3 class="font-semibold">{{ s.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ s.body }}</p>
          </li>
        </ol>
        <div class="grid gap-6 border-t pt-10 md:grid-cols-3">
          <div v-for="p in principles" :key="p.title" class="flex flex-col gap-2">
            <h3 class="font-semibold">{{ p.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ p.body }}</p>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="scroll-mt-20 bg-neutral-50">
        <div class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-24">
          <div class="flex flex-col items-center gap-3 text-center">
            <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing</h2>
            <p class="text-muted-foreground">Every account starts with 14 days of Pro, free and without a card. Then keep the free plan or upgrade when the feed starts paying for itself. Self-hosting is always free.</p>
          </div>
          <PlanCards v-if="catalogue" :plans="catalogue.plans" highlight="solo">
            <template #action="{ plan }">
              <Button as-child :variant="plan.id === 'solo' ? 'default' : 'outline'" class="rounded-full">
                <NuxtLink to="/login">{{ plan.id === 'free' ? 'Start free' : `Choose ${plan.label}` }}</NuxtLink>
              </Button>
            </template>
          </PlanCards>
        </div>
      </section>

      <!-- FAQ -->
      <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-24">
        <h2 class="text-3xl font-semibold tracking-tight">Questions</h2>
        <Accordion type="single" collapsible>
          <AccordionItem v-for="f in faqs" :key="f.q" :value="f.q">
            <AccordionTrigger>{{ f.q }}</AccordionTrigger>
            <AccordionContent><p class="text-muted-foreground">{{ f.a }}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <!-- Final CTA -->
      <section class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-28 text-center">
        <LandingMochiMascot class="h-20 w-28" />
        <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Someone asked for your product today.</h2>
        <p class="text-muted-foreground">Start with one project. It takes about five minutes.</p>
        <LandingCta source="footer" secondary="selfhost" />
      </section>
    </main>

    <LandingFooter />
  </div>
</template>
