<script setup lang="ts">
import { BellRingIcon, CheckIcon, ClockIcon, CodeIcon, HandIcon, RadarIcon, ScaleIcon, SendIcon, SproutIcon, TrendingUpIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public

// Self-hosted instances have no marketing page.
if (edition !== 'cloud') {
  const { loggedIn } = useUserSession()
  await navigateTo(loggedIn.value ? '/app' : '/login', { replace: true })
}

const { data: catalogue } = await useFetch('/api/billing/plans', { immediate: edition === 'cloud' })

const seoDescription = 'Find customers on Reddit, Hacker News and Bluesky. Mochiscout watches the communities your buyers use, scores every new post for buying intent, alerts you to hot leads and drafts replies that fit the subreddit rules, for you to post from your own account. Free plan, open source.'
useMarketingSeo({
  title: 'Mochiscout: find customers on Reddit, Hacker News and Bluesky',
  description: seoDescription,
  path: '/',
})

const sources = ['reddit', 'hn', 'bluesky'] as const
const heroFacts = ['No card needed', 'Free plan after the trial', 'You always post yourself']

const differentiators = [
  { icon: RadarIcon, title: 'Watching while you work', body: 'Busy subreddits are checked every 15 minutes, quieter ones every few hours, plus Hacker News and Bluesky. Every new post is scored for buying intent, with the reason.' },
  { icon: BellRingIcon, title: 'Hot leads, within the hour', body: 'When someone is clearly looking for what you sell, you hear about it by email, Slack or Discord, while the thread is still fresh and uncrowded.' },
  { icon: TrendingUpIcon, title: 'Threads that rank on Google', body: 'Threads that show up in Google searches are flagged. A helpful reply there keeps sending visitors long after the thread goes quiet.' },
  { icon: SendIcon, title: 'Replies ready before you are', body: 'Hot leads get a reply drafted automatically, from the whole thread and your product facts, checked against the subreddit\'s rules. They wait in one queue: read, tweak, post.' },
  { icon: ClockIcon, title: 'Know when to post', body: 'See when each subreddit is most active, in your time zone, before you publish a post of your own.' },
  { icon: SproutIcon, title: 'Learns what you want', body: 'Reply, save or dismiss with a reason, and scoring learns what fits your product. Drafts learn your voice from the replies you actually post.' },
]

const pains = [
  { title: 'Your launch post got removed.', body: 'Every subreddit has its own promo rules, and one wrong link costs you the post.' },
  { title: 'Searching eats your whole day.', body: 'Dozens of communities, several sites, and the good threads are buried under everything else.' },
  { title: 'You find the thread a week late.', body: 'By the time you see "anyone know a tool for this?", ten people have already answered.' },
]

const asks = [
  { source: 'reddit' as const, where: 'r/smallbusiness', text: 'Is there an invoicing app that chases late payments for me? I hate sending the "just following up" email.' },
  { source: 'hn' as const, where: 'Ask HN', text: 'What do you use to collect customer feedback without paying for a whole CX suite?' },
  { source: 'bluesky' as const, where: 'Bluesky', text: 'Looking for a calendar booking tool that doesn\'t cost $15 a seat. Small team, simple needs.' },
  { source: 'reddit' as const, where: 'r/SaaS', text: 'Spent my whole Sunday stitching together a status page. Surely someone has built this properly?' },
]

const steps = [
  { title: 'Paste your URL', body: 'We read your page to learn what it does and who it\'s for, then suggest keywords, competitors and the communities your buyers use.' },
  { title: 'Open your feed', body: 'New posts from Reddit, Hacker News and Bluesky are scored for buying intent. Fresh, uncrowded ones rise to the top, archived ones are flagged, and hot leads can email you.' },
  { title: 'Post in a minute', body: 'Open Today: the best threads already have a reply drafted and checked against the subreddit\'s rules. Tweak it, copy it, and post it from your own account.' },
]

const principles = [
  { icon: HandIcon, title: 'Your account, your voice', body: 'No auto-posting, no borrowed accounts, no DMs. Replies come from you, so they stay up and the reputation you build is yours.' },
  { icon: ScaleIcon, title: 'Rules first', body: 'Each subreddit\'s promotion rules, karma and account-age limits are checked before you post, with per-sub cooldowns and a daily promo cap.' },
  { icon: CodeIcon, title: 'Open source', body: 'AGPL-licensed. Run it free on your own Cloudflare account, or let us host it for you.' },
]

const openSource = [
  { title: 'Read every line', body: 'See exactly how threads are found and scored, and what is sent to the AI. No black box.' },
  { title: 'Self-host for free', body: 'One Cloudflare Worker with D1 and KV. Bring your own Anthropic and TinyFish keys; no plan limits.' },
  { title: 'Help shape it', body: 'Fix a bug, add a source, or correct a subreddit\'s rules. Pull requests are welcome.' },
]

const faqs = [
  { q: 'Will this get my account banned?', a: 'It is built to prevent that. Every draft is checked against the subreddit\'s rules, promotional posts are rate-limited per community and per day, and nothing is ever posted for you.' },
  { q: 'Does Mochiscout post for me?', a: 'No. It never posts, comments, votes or sends messages. It does everything up to that point: finds the thread, drafts the reply, checks the rules and tells you when a subreddit is busiest. Posting it yourself takes about a minute.' },
  { q: 'Why not post for me?', a: 'Comments from bots or from accounts that aren\'t yours get removed and can get you banned, and when readers notice, they remember the brand. A reply from your own account, in your words, stays up and keeps working for you.' },
  { q: 'How quickly will I see new threads?', a: 'Busy subreddits are checked every 15 minutes and quieter ones every few hours; new posts are scored as they arrive. On Solo and Pro, hot leads are emailed (or sent to Slack or Discord) and get a reply drafted automatically.' },
  { q: 'Which sites are covered?', a: 'Reddit on every plan. Hacker News and Bluesky on Solo and Pro. X is coming soon.' },
  { q: 'Is there a free plan?', a: 'Yes. Every new account gets 14 days of Pro free, no card. After that you keep a free plan with one project, three watched subreddits and a weekly digest, or pick Solo or Pro. Self-hosting is free with no limits.' },
  { q: 'I used GummySearch. Is this a replacement?', a: 'For finding customers, yes. GummySearch shuts down on December 1, 2026. Mochiscout finds the threads where people ask for what you sell, on Reddit and three other sites, without the Reddit Data API that GummySearch lost.' },
  { q: 'Is Mochiscout open source?', a: 'Yes. The whole app is on GitHub under the AGPL-3.0 license, and the subreddit rules library under CC BY-SA 4.0. You can read the code, run it free on your own Cloudflare account with your own API keys, or let us host it.' },
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
      <section class="relative isolate -mt-16 overflow-hidden pt-16">
        <div aria-hidden="true" class="absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_50%_0%,var(--brand-soft),transparent_75%)]" />
        <div aria-hidden="true" class="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-neutral-300)_1px,transparent_1px)] mask-[radial-gradient(60%_55%_at_50%_10%,black,transparent)] bg-size-[22px_22px] opacity-50" />
        <div class="mx-auto flex max-w-4xl flex-col items-center gap-7 px-4 pt-16 pb-14 text-center sm:pt-24">
          <NuxtLink to="/alternatives/gummysearch" class="group inline-flex items-center gap-2 rounded-full border bg-background/80 py-1 ps-1 pe-3 text-sm text-muted-foreground shadow-xs/5 backdrop-blur transition-colors hover:text-foreground">
            <span class="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-foreground">New</span>
            <span class="hidden sm:inline">GummySearch shuts down Dec 1.</span>
            <span class="font-medium text-foreground"><span class="sm:hidden">Moving from GummySearch?</span><span class="hidden sm:inline">See how we compare</span> <span class="inline-block transition-transform group-hover:translate-x-0.5">→</span></span>
          </NuxtLink>
          <h1 class="text-balance text-[2.75rem] leading-[1.05] font-semibold tracking-tighter sm:text-7xl">
            Find the people already
            <span class="relative whitespace-nowrap text-brand">
              asking
              <svg aria-hidden="true" viewBox="0 0 220 16" preserveAspectRatio="none" class="absolute inset-x-0 -bottom-1.5 h-3 w-full sm:-bottom-2 sm:h-4"><path d="M3 11c38-6 76-9 108-8s70 4 106 7" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" class="opacity-35" /></svg>
            </span>
            for your product.
          </h1>
          <p class="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            Mochiscout watches Reddit, Hacker News and Bluesky around the clock, flags the people ready to buy, and drafts the reply. You read it and post it from your own account.
          </p>
          <LandingCta source="hero" secondary="how" />
          <ul class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li v-for="t in heroFacts" :key="t" class="flex items-center gap-1.5"><CheckIcon class="size-4 text-brand" /> {{ t }}</li>
            <li>
              <a :href="site.repo" target="_blank" rel="noopener" class="flex items-center gap-1.5 transition-colors hover:text-foreground">
                <GitHubMark class="size-4 text-foreground" /> Open source
              </a>
            </li>
          </ul>
        </div>
      </section>

      <!-- Product mockup -->
      <section class="mx-auto max-w-6xl px-3 sm:px-4">
        <div class="relative rounded-[2rem] bg-linear-to-b from-brand-soft to-neutral-50 px-3 pt-10 ring-1 ring-black/5 sm:px-10 sm:pt-14">
          <LandingMochiMascot lively class="absolute -top-8 right-6 h-16 w-24 sm:right-12 sm:h-20 sm:w-28" />
          <div class="absolute top-4 left-4 hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            Watching
            <span class="flex -space-x-1.5">
              <LandingSourceBadge v-for="src in sources" :key="src" :source="src" size="sm" />
            </span>
            <span class="rounded-full border bg-background/70 px-2 py-px text-[11px]">X coming soon</span>
          </div>
          <div class="mx-auto max-w-4xl pb-3 sm:pb-10">
            <LandingFeedMockup />
          </div>
        </div>
      </section>

      <!-- Problem -->
      <section class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-24">
        <div class="flex max-w-2xl flex-col gap-3">
          <p class="text-sm font-medium text-brand-foreground">The problem</p>
          <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">You built it. You launched it. It went quiet.</h2>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <p class="text-sm font-medium text-brand-foreground">The opportunity</p>
            <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Your customers are already posting.</h2>
            <p class="text-muted-foreground">People describe their problem in public every day, often naming the tool they're unhappy with. These are the kinds of posts Mochiscout surfaces.</p>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <p class="text-sm font-medium text-brand-foreground">Why Mochiscout</p>
          <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">It does the legwork. You keep the voice.</h2>
          <p class="text-muted-foreground">Mochiscout watches, scores and drafts around the clock. What's left for you is the part that should be yours: reading the thread and pressing Post.</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="d in differentiators" :key="d.title" class="flex flex-col gap-2 rounded-2xl border p-5">
            <span class="mb-1 flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-foreground"><component :is="d.icon" class="size-4.5" /></span>
            <h3 class="font-semibold">{{ d.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ d.body }}</p>
          </div>
        </div>
        <NuxtLink to="/alternatives" class="w-fit text-sm font-medium underline-offset-4 hover:underline">Compare with GummySearch, Brand24, F5Bot, Syften and others →</NuxtLink>
      </section>

      <!-- How it works -->
      <section id="how" class="mx-auto flex max-w-5xl scroll-mt-20 flex-col gap-10 px-4 py-24">
        <div class="flex max-w-2xl flex-col gap-3">
          <p class="text-sm font-medium text-brand-foreground">How it works</p>
          <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Three steps. Ten minutes a day.</h2>
          <p class="text-muted-foreground">Set up once, then check your feed with your morning coffee. A daily email brings the best threads to you.</p>
        </div>
        <ol class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <li v-for="(s, i) in steps" :key="s.title" class="flex flex-col gap-3 rounded-2xl border p-5">
            <span class="flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-foreground tabular-nums">{{ i + 1 }}</span>
            <h3 class="font-semibold">{{ s.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ s.body }}</p>
          </li>
        </ol>
        <div class="grid grid-cols-1 gap-6 border-t pt-10 md:grid-cols-3">
          <div v-for="p in principles" :key="p.title" class="flex flex-col gap-2">
            <h3 class="flex items-center gap-2 font-semibold"><component :is="p.icon" class="size-4 text-brand" /> {{ p.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ p.body }}</p>
          </div>
        </div>
      </section>

      <!-- Open source -->
      <section class="mx-auto max-w-5xl px-4 pb-24">
        <div class="relative overflow-hidden rounded-3xl bg-neutral-950 px-6 py-12 text-neutral-300 sm:px-12 sm:py-16">
          <LandingMochiMascot lively :blink="false" class="absolute -right-4 -bottom-6 h-24 w-32 opacity-90 sm:right-10 sm:bottom-auto sm:top-10" />
          <div class="relative flex max-w-2xl flex-col gap-4">
            <span class="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
              <GitHubMark class="size-3.5 text-white" /> Open source
            </span>
            <h2 class="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built in the open.</h2>
            <p class="text-pretty text-neutral-400">Mochiscout's code is public on GitHub. Use the hosted service, or run your own copy on your own Cloudflare account.</p>
          </div>
          <div class="relative mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div v-for="o in openSource" :key="o.title" class="flex flex-col gap-1.5 border-t border-neutral-800 pt-4">
              <h3 class="font-semibold text-white">{{ o.title }}</h3>
              <p class="text-sm text-neutral-400">{{ o.body }}</p>
            </div>
          </div>
          <div class="relative mt-10 flex flex-wrap gap-2">
            <Button as-child size="lg" class="rounded-full bg-white px-5 text-neutral-950 hover:bg-neutral-200">
              <a :href="site.repo" target="_blank" rel="noopener"><GitHubMark /> Star on GitHub</a>
            </Button>
            <Button as-child size="lg" variant="ghost" class="rounded-full px-5 text-neutral-300 hover:bg-neutral-800 hover:text-white">
              <a :href="`${site.repo}/blob/main/docs/self-host.md`" target="_blank" rel="noopener">Self-hosting guide →</a>
            </Button>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="scroll-mt-20 bg-neutral-50">
        <div class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-24">
          <div class="flex flex-col items-center gap-3 text-center">
            <p class="text-sm font-medium text-brand-foreground">Pricing</p>
            <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing</h2>
            <p class="text-muted-foreground">Every account starts with 14 days of Pro, free and without a card. Then keep the free plan or upgrade when the feed starts paying for itself. Self-hosting is always free.</p>
          </div>
          <PlanCards v-if="catalogue" :plans="catalogue.plans" highlight="solo">
            <template #action="{ plan }">
              <Button as-child :variant="plan.id === 'solo' ? 'default' : 'outline'" class="rounded-full" :class="plan.id === 'solo' ? 'bg-brand text-white shadow-sm shadow-brand/25 hover:bg-brand/90' : ''">
                <NuxtLink to="/login?mode=signup">{{ plan.id === 'free' ? 'Start free' : `Try ${plan.label} free` }}</NuxtLink>
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
      <div class="px-4 pb-24">
        <section class="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-[2rem] bg-linear-to-b from-brand-soft to-background px-4 py-16 text-center ring-1 ring-black/5 sm:py-20">
          <LandingMochiMascot lively class="h-20 w-28" />
          <h2 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Someone asked for your product today.</h2>
          <p class="text-muted-foreground">Start with one project. It takes about five minutes.</p>
          <LandingCta source="footer" secondary="selfhost" />
        </section>
      </div>
    </main>

    <LandingFooter />
  </div>
</template>
