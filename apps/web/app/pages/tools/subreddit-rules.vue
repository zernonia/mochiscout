<script setup lang="ts">
import { freeTool } from '#shared/tools'
import { SearchIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

const tool = freeTool('subreddit-rules')
const path = `/tools/${tool.slug}`
useMarketingSeo({ title: 'Subreddit rules checker: can you promote in this subreddit?', description: tool.description, path })

const faq = [
  { q: 'Can I promote my product on Reddit?', a: 'In some subreddits, yes. Many allow it only in a weekly self-promotion thread, with a specific flair, or when the post is genuinely useful and you disclose that you built it. Others ban it outright. Check each subreddit\'s rules before you post.' },
  { q: 'Where do these rules come from?', a: 'From each subreddit\'s official rules page, read automatically and kept word for word, with a short summary of what matters for promotion: the promo policy, links, karma or account-age limits, and how often you can mention your product.' },
  { q: 'What if a subreddit isn\'t listed?', a: 'Search for it. We read its official rules on the spot and add it to the list, usually within a few seconds.' },
  { q: 'How often are the rules updated?', a: 'Every subreddit is re-checked at least once a month. Moderators do change rules, so read the sidebar too before an important post.' },
]
useJsonLd([
  { '@type': 'WebApplication', 'name': tool.name, 'url': `${site.url}${path}`, 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'Web', 'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' }, 'description': tool.description },
  { '@type': 'FAQPage', 'mainEntity': faq.map(f => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })) },
])

const { data: subs } = await useFetch('/api/public/subreddits')

type Policy = 'none' | 'weekly_thread_only' | 'flair_only' | 'allowed_with_value' | 'allowed'
const groups: { policy: Policy, label: string, class: string }[] = [
  { policy: 'allowed', label: 'Promotion allowed', class: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300' },
  { policy: 'allowed_with_value', label: 'Allowed if genuinely useful', class: 'bg-sky-500/12 text-sky-800 dark:text-sky-300' },
  { policy: 'flair_only', label: 'Only with the right flair', class: 'bg-amber-500/14 text-amber-900 dark:text-amber-300' },
  { policy: 'weekly_thread_only', label: 'Only in a promo thread', class: 'bg-amber-500/14 text-amber-900 dark:text-amber-300' },
  { policy: 'none', label: 'No self-promotion', class: 'bg-red-500/12 text-red-800 dark:text-red-300' },
]
const grouped = computed(() => groups
  .map(g => ({ ...g, subs: (subs.value ?? []).filter(s => s.promo === g.policy).sort((a, b) => a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' })) }))
  .filter(g => g.subs.length))

const query = ref('')
const checking = ref(false)
const error = ref('')
async function check() {
  error.value = ''
  const name = query.value.trim().replace(/^(https?:\/\/)?(www\.|old\.)?(reddit\.com)?\/?(r\/)?/i, '').split(/[/?#\s]/)[0]?.toLowerCase() ?? ''
  if (!name) return
  trackClient('tool_used', { tool: 'subreddit-rules' })
  if (subs.value?.some(s => s.name === name)) return navigateTo(`/subreddits/${name}`)
  checking.value = true
  try {
    const res = await $fetch<{ path: string }>('/api/public/tools/rules-lookup', { method: 'POST', body: { name } })
    await navigateTo(res.path)
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'Something went wrong. Try again.')
  }
  finally {
    checking.value = false
  }
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
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Can you promote in this subreddit?</h1>
        <p class="max-w-2xl text-lg text-muted-foreground">Check any subreddit's self-promotion rules before you post: whether you can mention your product, where links are allowed, karma limits, and the full official rules.</p>
        <form class="flex max-w-xl flex-col gap-2 sm:flex-row" @submit.prevent="check">
          <InputGroup class="h-11 flex-1">
            <InputGroupAddon>r/</InputGroupAddon>
            <InputGroupInput v-model="query" list="known-subs" placeholder="SaaS, startups, iOSProgramming…" aria-label="Subreddit" autocomplete="off" />
          </InputGroup>
          <datalist id="known-subs">
            <option v-for="s in subs" :key="s.name" :value="s.displayName" />
          </datalist>
          <Button type="submit" size="lg" class="h-11" :loading="checking"><SearchIcon /> {{ checking ? 'Reading its rules…' : 'Check rules' }}</Button>
        </form>
        <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
        <p v-else-if="checking" class="text-sm text-muted-foreground">Not in our list yet, so we're reading its official rules now. This takes a few seconds.</p>
      </section>

      <section v-if="grouped.length" class="flex flex-col gap-6">
        <h2 class="text-2xl font-semibold tracking-tight">Self-promotion rules for {{ subs?.filter(s => s.promo).length }} subreddits</h2>
        <div v-for="g in grouped" :key="g.policy" class="flex flex-col gap-2">
          <h3 class="flex items-center gap-2 text-sm font-semibold">
            <span class="rounded-full px-2 py-0.5 text-xs" :class="g.class">{{ g.label }}</span>
            <span class="font-normal text-muted-foreground">{{ g.subs.length }}</span>
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <NuxtLink v-for="s in g.subs" :key="s.name" :to="`/subreddits/${s.name}`" class="rounded-lg border px-2.5 py-1 text-sm transition-colors hover:bg-muted">r/{{ s.displayName }}</NuxtLink>
          </div>
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
        <h2 class="text-balance text-2xl font-semibold tracking-tight">Reply where it's allowed, to people who asked</h2>
        <p class="max-w-xl text-muted-foreground">Mochiscout finds threads asking for what you sell, checks each subreddit's rules for you, and drafts a reply you post yourself.</p>
        <LandingCta source="tool-subreddit-rules" />
      </section>
    </main>
    <LandingFooter />
  </div>
</template>
