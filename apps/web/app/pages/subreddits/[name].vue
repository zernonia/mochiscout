<script setup lang="ts">
import { CheckCircle2Icon, CircleAlertIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldQuestionIcon } from '@lucide/vue'

const { edition } = useRuntimeConfig().public
if (edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })

const route = useRoute()
const name = String(route.params.name).toLowerCase()
const { data: sub, error } = await useFetch(`/api/public/subreddits/${name}`)
if (error.value || !sub.value) throw createError({ statusCode: 404, statusMessage: 'No page for this subreddit yet', fatal: true })
const s = sub.value

const path = `/subreddits/${s.name}`
const gradeInfo = {
  friendly: { label: 'Promotion-friendly', icon: ShieldCheckIcon, class: 'border-emerald-500/30 bg-emerald-500/6 text-emerald-800 dark:text-emerald-300', summary: 'You can mention your product here, as long as the post or reply is genuinely useful.' },
  careful: { label: 'Promote carefully', icon: ShieldAlertIcon, class: 'border-amber-500/30 bg-amber-500/8 text-amber-900 dark:text-amber-300', summary: 'Promotion is restricted. Follow the rules below exactly, or help without mentioning your product.' },
  strict: { label: 'Strict about promotion', icon: ShieldAlertIcon, class: 'border-red-500/30 bg-red-500/6 text-red-800 dark:text-red-300', summary: 'Self-promotion is likely to be removed. Answer questions helpfully and leave your product out.' },
  unknown: { label: 'Not enough data yet', icon: ShieldQuestionIcon, class: 'bg-muted/50 text-muted-foreground', summary: 'We haven\'t seen enough here to judge. Read the subreddit\'s rules before you post.' },
} as const
const g = gradeInfo[s.verdict.grade]

const promoLabel: Record<string, string> = {
  none: 'Not allowed',
  weekly_thread_only: 'Only in a recurring self-promotion thread',
  flair_only: 'Only with the right flair',
  allowed_with_value: 'Allowed when genuinely useful',
  allowed: 'Allowed',
}
const linksLabel: Record<string, string> = { none: 'Not allowed', in_comments_only: 'Only in comments', yes: 'Allowed' }
const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`)
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`
const maxShare = Math.max(0.0001, ...(s.stats?.hours ?? []))
const dn = s.displayName
const updated = s.statsAt ? new Date(s.statsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null

const title = `r/${dn} self-promotion rules: can you promote your product there?`
const description = s.stats
  ? `Can you promote in r/${dn}? ${s.rules ? promoLabel[s.rules.promo_policy] : g.label}. ${s.stats.posts30d} posts and ${s.stats.buyingPosts30d} buying-intent posts in the last 30 days${s.verdict.removalRate !== null ? `, ${pct(s.verdict.removalRate)} of checked posts removed` : ''}. Rules, best times to post and how to reply without getting banned.`
  : `Can you promote in r/${dn}? ${s.rules ? promoLabel[s.rules.promo_policy] : g.label}.${s.rules?.official.length ? ` All ${s.rules.official.length} official rules, summarised for founders:` : ''} what to disclose, where links are allowed and how to reply without getting banned.`
useMarketingSeo({ title, description, path, type: 'article' })
if (!s.indexable) useSeoMeta({ robots: 'noindex, follow' })

// Tips derived from the data, so each page says something specific.
const tips = computed(() => {
  const out: string[] = []
  const r = s.rules
  if (r?.promo_policy === 'none') out.push(`Don't mention your product in r/${dn}. Answer the question; people who want more will check your profile.`)
  else if (r?.promo_policy === 'weekly_thread_only') out.push(`Keep promotion to ${r.self_promo_thread ? `the "${r.self_promo_thread}" thread` : 'the recurring self-promotion thread'}. Elsewhere, just help.`)
  else if (r?.promo_policy === 'flair_only') out.push('Use the promotion flair whenever you mention your product.')
  else out.push('Lead with a useful answer. Mention your product once, say you built it, and only when it fits the question.')
  if (r?.links_allowed === 'none' || (s.verdict.linkedReplyRemovalRate ?? 0) >= 0.3) out.push('Leave links out. Name the product instead; people can search for it.')
  else if (r?.links_allowed === 'in_comments_only') out.push('Put links in comments, not in the post itself.')
  if (r?.min_karma || r?.min_account_age_days) out.push(`Check your account first: ${[r.min_karma ? `${r.min_karma}+ karma` : '', r.min_account_age_days ? `${r.min_account_age_days}+ days old` : ''].filter(Boolean).join(' and ')}.`)
  if (s.peakHours.length) out.push(`Most posts go up around ${s.peakHours.map(h => hourLabel(h.hour)).join(', ')} UTC. Replying early, while a thread is fresh, gets more of your answer seen.`)
  return out
})

useJsonLd([
  { '@type': 'WebPage', 'name': title, 'url': `${site.url}${path}`, 'description': description, ...(s.statsAt ? { dateModified: new Date(s.statsAt).toISOString().slice(0, 10) } : {}) },
  {
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Mochiscout', 'item': site.url },
      { '@type': 'ListItem', 'position': 2, 'name': 'Subreddits', 'item': `${site.url}/subreddits` },
      { '@type': 'ListItem', 'position': 3, 'name': `r/${dn}`, 'item': `${site.url}${path}` },
    ],
  },
])
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto flex max-w-3xl flex-col gap-12 px-4 pt-16 pb-24 sm:pt-20">
      <section class="flex flex-col gap-4">
        <nav class="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <NuxtLink to="/subreddits" class="hover:text-foreground">Subreddits</NuxtLink>
          <span class="mx-1.5">/</span>
          <span>r/{{ dn }}</span>
        </nav>
        <h1 class="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">r/{{ dn }}: self-promotion rules and how to find customers there</h1>
        <p v-if="s.description" class="text-lg text-muted-foreground">“{{ s.description }}”</p>
        <div class="flex gap-3 rounded-2xl border p-4" :class="g.class">
          <component :is="g.icon" class="mt-0.5 size-5 shrink-0" />
          <div>
            <div class="font-semibold">{{ g.label }}</div>
            <p class="text-sm opacity-90">{{ g.summary }}</p>
            <ul v-if="s.verdict.reasons.length" class="mt-2 list-disc space-y-0.5 pl-5 text-sm opacity-90">
              <li v-for="r in s.verdict.reasons" :key="r">{{ r }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Numbers -->
      <section v-if="s.stats" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border p-4"><div class="text-2xl font-semibold tabular-nums">{{ s.stats.posts30d }}</div><div class="text-xs text-muted-foreground">posts, last 30 days</div></div>
        <div class="rounded-xl border p-4"><div class="text-2xl font-semibold tabular-nums">{{ s.stats.buyingPosts30d }}</div><div class="text-xs text-muted-foreground">asking for a tool or comparing</div></div>
        <div class="rounded-xl border p-4"><div class="text-2xl font-semibold tabular-nums">{{ pct(s.verdict.removalRate) ?? '–' }}</div><div class="text-xs text-muted-foreground">of checked posts removed</div></div>
        <div class="rounded-xl border p-4"><div class="text-2xl font-semibold tabular-nums">{{ s.peakHours[0] ? hourLabel(s.peakHours[0].hour) : '–' }}</div><div class="text-xs text-muted-foreground">busiest hour (UTC)</div></div>
      </section>

      <!-- Rules -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Self-promotion rules</h2>
        <div v-if="s.rules" class="divide-y rounded-xl border">
          <div class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">Self-promotion</div><div class="text-sm">{{ promoLabel[s.rules.promo_policy] }}</div></div>
          <div v-if="s.rules.self_promo_thread" class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">Promotion thread</div><div class="text-sm">{{ s.rules.self_promo_thread }}</div></div>
          <div v-if="s.rules.links_allowed" class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">Links to your site</div><div class="text-sm">{{ linksLabel[s.rules.links_allowed] }}</div></div>
          <div v-if="s.rules.min_karma" class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">Minimum karma</div><div class="text-sm">{{ s.rules.min_karma }}</div></div>
          <div v-if="s.rules.min_account_age_days" class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">Minimum account age</div><div class="text-sm">{{ s.rules.min_account_age_days }} days</div></div>
          <div v-if="s.rules.cooldown_days" class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">How often</div><div class="text-sm">At most one promotional mention every {{ s.rules.cooldown_days }} days</div></div>
          <div v-if="s.rules.notes" class="grid gap-1 p-4 sm:grid-cols-[200px_1fr]"><div class="text-sm font-medium">Also</div><div class="text-sm">{{ s.rules.notes }}</div></div>
        </div>
        <p v-else class="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">We haven't found r/{{ dn }}'s promotion rules yet. Check the sidebar on Reddit before posting.</p>
        <p class="text-xs text-muted-foreground">
          <template v-if="s.rules">Summarised from r/{{ dn }}'s official rules, checked on {{ new Date(`${s.rules.last_verified}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) }}. Moderators change rules; always check before posting.</template>
          <a :href="`https://www.reddit.com/r/${s.name}/about/rules`" target="_blank" rel="noopener nofollow" class="ms-1 underline">Official rules</a>
        </p>
        <div v-if="s.rules?.official.length" class="flex flex-col gap-3 pt-2">
          <h3 class="font-semibold">All {{ s.rules.official.length }} rules of r/{{ dn }}</h3>
          <ol class="flex list-decimal flex-col gap-3 pl-5 text-sm">
            <li v-for="r in s.rules.official" :key="r.title">
              <span class="font-medium">{{ r.title }}</span><span v-if="r.kind !== 'all'" class="text-muted-foreground"> (applies to {{ r.kind === 'link' ? 'posts' : 'comments' }})</span>
              <p v-if="r.text" class="mt-1 whitespace-pre-line text-muted-foreground">{{ r.text }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- When people post -->
      <section v-if="s.stats?.posts30d" class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">When people post (UTC)</h2>
        <div class="flex h-28 items-end gap-0.5 rounded-xl border p-3" role="img" :aria-label="`Busiest hours: ${s.peakHours.map(h => hourLabel(h.hour)).join(', ')} UTC`">
          <div v-for="(share, hour) in s.stats.hours" :key="hour" class="flex flex-1 flex-col items-center gap-1">
            <div class="w-full rounded-sm bg-neutral-900/80 dark:bg-neutral-100/80" :style="{ height: `${Math.max(2, (share / maxShare) * 72)}px` }" :title="`${hourLabel(hour)} · ${Math.round(share * 100)}%`" />
            <span v-if="hour % 6 === 0" class="text-[10px] text-muted-foreground tabular-nums">{{ hour }}</span>
          </div>
        </div>
      </section>

      <!-- Tips -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">How to find customers in r/{{ dn }} without getting banned</h2>
        <ul class="flex flex-col gap-2">
          <li v-for="t in tips" :key="t" class="flex gap-2 text-sm"><CheckCircle2Icon class="mt-0.5 size-4 shrink-0 text-emerald-600" /> {{ t }}</li>
          <li class="flex gap-2 text-sm"><CircleAlertIcon class="mt-0.5 size-4 shrink-0 text-amber-600" /> Never post the same promotional text across subreddits, and don't ask friends to upvote. Both get accounts banned.</li>
        </ul>
      </section>

      <!-- CTA -->
      <section class="flex flex-col items-center gap-4 rounded-3xl bg-neutral-100 px-6 py-10 text-center">
        <LandingMochiMascot class="h-14 w-20" />
        <h2 class="text-balance text-2xl font-semibold tracking-tight">See who in r/{{ dn }} is asking for what you sell</h2>
        <p class="max-w-lg text-sm text-muted-foreground">Mochiscout scores every new post for buying intent, checks these rules before you reply, and drafts an answer you post yourself.</p>
        <LandingCta :source="`sub-${s.name}`" />
      </section>

      <section class="flex flex-col gap-3 border-t pt-8 text-sm text-muted-foreground">
        <p v-if="s.stats">
          Numbers are pooled, anonymous outcomes from Mochiscout users and the posts we check, over the last 30 days<template v-if="updated">, updated {{ updated }}</template>. We never post or vote on Reddit.
        </p>
        <div v-if="s.related.length" class="flex flex-wrap gap-2">
          <NuxtLink v-for="r in s.related" :key="r.name" :to="`/subreddits/${r.name}`" class="rounded-full border px-3 py-1 hover:text-foreground">r/{{ r.name }}</NuxtLink>
        </div>
      </section>
    </main>
    <LandingFooter />
  </div>
</template>
