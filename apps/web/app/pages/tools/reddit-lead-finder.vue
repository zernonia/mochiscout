<script setup lang="ts">
import { freeTool } from '#shared/tools'
import { ExternalLinkIcon, MessageCircleQuestionIcon, RadarIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

const tool = freeTool('reddit-lead-finder')
const path = `/tools/${tool.slug}`
useMarketingSeo({ title: 'Free Reddit lead finder: find people asking for your product', description: tool.description, path })

const faq = [
  { q: 'How do I find customers on Reddit?', a: 'Look for threads where people ask for a recommendation, compare tools or want an alternative to something they use. Answer the question first; mention your product only where the subreddit allows it, and say you built it.' },
  { q: 'Where do the results come from?', a: 'Recent Reddit threads from web search and Hacker News posts and comments from the last 60 days, ranked by how closely they match what you sell and whether the person is asking for something.' },
  { q: 'Is this a GummySearch alternative?', a: 'This free tool is a one-off search. Mochiscout, the app behind it, watches Reddit, Hacker News, Bluesky and X for you every 15 minutes, scores each post for buying intent, checks the subreddit\'s rules and drafts a reply you post yourself.' },
  { q: 'Can I reply with a link to my product?', a: 'It depends on the subreddit. Check its rules with the free subreddit rules checker before you post.' },
]
useJsonLd([
  { '@type': 'WebApplication', 'name': tool.name, 'url': `${site.url}${path}`, 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'Web', 'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' }, 'description': tool.description },
  { '@type': 'FAQPage', 'mainEntity': faq.map(f => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })) },
])

interface Lead { title: string, url: string, source: 'reddit' | 'hn', channel: string | null, snippet: string, asking: boolean, postedAt: string | null }

const examples = ['changelog tool', 'invoicing app for freelancers', 'habit tracker app', 'uptime monitoring']
const what = ref('')
const searched = ref('')
const leads = ref<Lead[] | null>(null)
const loading = ref(false)
const error = ref('')

async function find(term?: string) {
  if (term) what.value = term
  const q = what.value.trim()
  if (q.length < 3) {
    error.value = 'Describe what you sell in a few words.'
    return
  }
  error.value = ''
  loading.value = true
  trackClient('tool_used', { tool: 'reddit-lead-finder' })
  try {
    const res = await $fetch<{ what: string, leads: Lead[] }>('/api/public/tools/lead-finder', { method: 'POST', body: { what: q } })
    leads.value = res.leads
    searched.value = res.what
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'Something went wrong. Try again.')
  }
  finally {
    loading.value = false
  }
}

const ago = (iso: string | null) => {
  if (!iso) return null
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000))
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-4xl flex-col gap-12 px-4 pt-16 pb-24 sm:pt-20">
      <section class="flex flex-col gap-5">
        <nav class="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <NuxtLink to="/tools" class="hover:text-foreground">Free tools</NuxtLink>
          <span class="mx-1.5">/</span>
          <span>{{ tool.name }}</span>
        </nav>
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Find people on Reddit asking for what you sell</h1>
        <p class="max-w-2xl text-lg text-muted-foreground">Type what you sell. See recent Reddit and Hacker News threads where people ask for a recommendation, compare tools or want an alternative.</p>
        <form class="flex max-w-xl flex-col gap-2 sm:flex-row" @submit.prevent="find()">
          <Input v-model="what" class="h-11 flex-1" maxlength="120" placeholder="e.g. changelog tool for SaaS" aria-label="What you sell" />
          <Button type="submit" size="lg" class="h-11" :loading="loading"><RadarIcon /> {{ loading ? 'Searching…' : 'Find leads' }}</Button>
        </form>
        <div class="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          Try:
          <button v-for="e in examples" :key="e" type="button" class="rounded-full border px-2.5 py-0.5 hover:bg-muted" :disabled="loading" @click="find(e)">{{ e }}</button>
        </div>
        <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
      </section>

      <section v-if="leads" class="flex flex-col gap-4" aria-live="polite">
        <h2 class="text-xl font-semibold">{{ leads.length ? `${leads.length} threads for "${searched}"` : `No recent threads found for "${searched}"` }}</h2>
        <p v-if="!leads.length" class="text-sm text-muted-foreground">Try a broader description, like the category people would search for ("email marketing tool" rather than your product's name).</p>
        <ol class="flex flex-col divide-y rounded-xl border">
          <li v-for="l in leads" :key="l.url" class="flex flex-col gap-1.5 p-4">
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span v-if="l.asking" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 font-medium text-emerald-800 dark:text-emerald-300"><MessageCircleQuestionIcon class="size-3" /> Asking</span>
              <NuxtLink v-if="l.channel" :to="`/subreddits/${l.channel}`" class="hover:text-foreground hover:underline">r/{{ l.channel }}</NuxtLink>
              <span v-else>Hacker News</span>
              <span v-if="ago(l.postedAt)">{{ ago(l.postedAt) }}</span>
            </div>
            <a :href="l.url" target="_blank" rel="noopener nofollow" class="inline-flex items-start gap-1 font-medium hover:underline">{{ l.title }} <ExternalLinkIcon class="mt-1 size-3 shrink-0" /></a>
            <p v-if="l.snippet" class="line-clamp-2 text-sm text-muted-foreground">{{ l.snippet }}</p>
          </li>
        </ol>
        <div class="flex flex-col items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/6 p-5 sm:flex-row sm:items-center">
          <p class="flex-1 text-sm"><span class="font-semibold">Get these as they're posted.</span> Mochiscout checks every 15 minutes, scores each thread for buying intent, flags subreddit rules and drafts a reply you post yourself.</p>
          <LandingCta source="tool-lead-finder-results" />
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <h2 class="text-2xl font-semibold tracking-tight">Questions</h2>
        <Accordion type="single" collapsible>
          <AccordionItem v-for="f in faq" :key="f.q" :value="f.q">
            <AccordionTrigger>{{ f.q }}</AccordionTrigger>
            <AccordionContent><p class="text-muted-foreground">{{ f.a }}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section class="flex flex-col items-center gap-5 rounded-3xl bg-neutral-100 px-6 py-12 text-center dark:bg-neutral-900">
        <h2 class="text-balance text-2xl font-semibold tracking-tight">Someone asked for your product today.</h2>
        <p class="max-w-xl text-muted-foreground">Paste your URL and see the threads worth answering in about five minutes. Free plan, no card.</p>
        <LandingCta source="tool-lead-finder" />
      </section>
    </main>
    <LandingFooter />
  </div>
</template>
