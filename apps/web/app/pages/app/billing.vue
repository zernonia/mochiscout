<script setup lang="ts">
import { CreditCardIcon, FolderIcon, HashIcon, SearchCheckIcon, SparklesIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })
useHead({ title: 'Billing · Mochiscout' })

const route = useRoute()
const { data: me, refresh } = useCachedFetch('/api/me')
const { data: catalogue } = useCachedFetch('/api/billing/plans')
const busy = ref<string | null>(null)

onMounted(() => {
  if (route.query.checkout === 'success') {
    toast.success('Thanks! Your plan updates as soon as the payment is confirmed.')
    setTimeout(refresh, 4000)
  }
})

/** Already paying: the plan button switches the subscription in place. */
const subscribed = computed(() => !me.value?.org.trial && (me.value?.org.plan === 'solo' || me.value?.org.plan === 'pro'))
const priceOf = (id: string) => catalogue.value?.plans.find(p => p.id === id)?.price ?? 0

function planAction(id: string, label: string) {
  if (me.value?.org.trial) return id === 'pro' ? 'Keep Pro' : `Choose ${label}`
  if (!subscribed.value) return `Upgrade to ${label}`
  return priceOf(id) > priceOf(me.value!.org.plan) ? `Upgrade to ${label}` : `Switch to ${label}`
}

async function choosePlan(id: string, label: string) {
  if (subscribed.value) {
    const upgrade = priceOf(id) > priceOf(me.value!.org.plan)
    const ok = window.confirm(upgrade
      ? `Switch to ${label} now? You'll be charged the prorated difference for the rest of this billing period.`
      : `Switch to ${label} now? The unused part of your current plan is credited to your next invoice.`)
    if (!ok) return
  }
  return go('/api/billing/checkout', { plan: id }, id)
}

async function go(path: '/api/billing/checkout' | '/api/billing/portal', body?: object, key: string = path) {
  busy.value = key
  try {
    const res = await $fetch<{ url: string } | { switched: true, plan: string }>(path, { method: 'POST', body })
    if ('switched' in res) {
      toast.success(`You're now on ${catalogue.value?.plans.find(p => p.id === res.plan)?.label ?? res.plan}.`)
      await Promise.all([refresh(), refreshNuxtData('project-nav')])
      busy.value = null
      return
    }
    window.location.href = res.url
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Billing is unavailable right now'))
    busy.value = null
  }
}

const meters = computed(() => me.value
  ? [
      { label: 'Projects', icon: FolderIcon, used: me.value.usage.projects, limit: me.value.limits.projects },
      { label: 'Watched subreddits', icon: HashIcon, used: me.value.usage.watchedSubreddits, limit: me.value.limits.watchedSubreddits },
      { label: 'Research runs this month', icon: SearchCheckIcon, used: me.value.usage.researchRuns, limit: me.value.limits.manualResearchPerMonth },
    ]
  : [])
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Billing" description="Your plan, what you have used this month, and upgrades." :icon="CreditCardIcon" />

    <template v-if="!me">
      <Skeleton class="h-36 w-full rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-3"><Skeleton v-for="i in 3" :key="i" class="h-72 rounded-2xl" /></div>
    </template>
    <AppEmpty v-else-if="me.edition !== 'cloud'" title="Self-hosted" description="Self-hosted instances have no plans or limits." />

    <template v-else-if="me">
      <section class="flex flex-col gap-5 rounded-2xl border bg-gradient-to-br from-brand-soft/60 via-card to-card p-4 shadow-xs/5 sm:p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-foreground" aria-hidden="true"><SparklesIcon class="size-4.5" /></span>
            <div class="flex min-w-0 flex-col gap-1">
              <h2 class="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
                {{ me.org.trial ? 'Pro trial' : `${me.limits.label} plan` }}
                <span v-if="me.org.planStatus === 'past_due'" class="rounded-full bg-red-500/12 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-400">Payment failed</span>
                <span v-else-if="me.org.planStatus === 'canceled'" class="rounded-full bg-amber-500/14 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">Cancelled</span>
              </h2>
              <p v-if="me.org.trial" class="max-w-2xl text-sm text-pretty text-muted-foreground">
                Everything in Pro, free until {{ new Date(me.org.trial.endsAt!).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) }} ({{ me.org.trial.daysLeft }} day{{ me.org.trial.daysLeft === 1 ? '' : 's' }} left), with up to {{ me.limits.draftsPerMonth }} AI drafts.
                After that you move to Free unless you choose a plan below. No card needed until then.
              </p>
              <p v-else-if="me.org.trialEnded && me.org.plan === 'free'" class="max-w-2xl text-sm text-pretty text-muted-foreground">
                Your Pro trial has ended. We kept your top 3 subreddits running; choose a plan to bring back the rest.
              </p>
              <p v-else-if="me.org.plan !== 'free'" class="max-w-2xl text-sm text-pretty text-muted-foreground">
                <template v-if="me.org.planStatus === 'past_due'">Payment failed: update your card in Manage billing. </template>
                <template v-else-if="me.org.planStatus === 'canceled'">Cancelled; active until the end of the period. </template>
                <template v-if="me.org.currentPeriodEnd">Current period ends {{ new Date(me.org.currentPeriodEnd).toLocaleDateString() }}.</template>
              </p>
            </div>
          </div>
          <Button
            v-if="me.org.plan !== 'free' && !me.org.trial && me.role === 'owner'"
            variant="outline"
            class="self-start"
            :disabled="!!busy"
            @click="go('/api/billing/portal')"
          >
            {{ busy === '/api/billing/portal' ? 'Opening…' : 'Manage billing' }}
          </Button>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div v-for="m in meters" :key="m.label" class="flex flex-col gap-2 rounded-xl bg-background/70 p-3 ring-1 ring-border/60">
            <div class="flex items-center gap-2 text-sm">
              <component :is="m.icon" class="size-4 shrink-0 text-brand" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">{{ m.label }}</span>
            </div>
            <div class="text-xl font-semibold tabular-nums">
              {{ m.used }}<span v-if="m.limit !== null" class="text-sm font-normal text-muted-foreground"> / {{ m.limit }}</span>
            </div>
            <div v-if="m.limit" class="h-1.5 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full" :class="m.used >= m.limit ? 'bg-amber-500' : 'bg-brand'" :style="{ width: `${Math.min(100, (m.used / m.limit) * 100)}%` }" />
            </div>
          </div>
        </div>
      </section>

      <PlanCards v-if="catalogue" :plans="catalogue.plans" :current="me.org.plan" :highlight="String(route.query.plan ?? '')">
        <template #action="{ plan }">
          <Button
            v-if="plan.id !== 'free' && (plan.id !== me.org.plan || me.org.trial) && me.role === 'owner'"
            :disabled="!!busy || !catalogue.billingConfigured"
            @click="choosePlan(plan.id, plan.label)"
          >
            {{ busy === plan.id ? (subscribed ? 'Switching…' : 'Opening checkout…') : planAction(plan.id, plan.label) }}
          </Button>
        </template>
      </PlanCards>
      <p v-if="catalogue && !catalogue.billingConfigured" class="text-xs text-muted-foreground">Billing is not configured on this server (POLAR_* secrets).</p>
      <p v-if="me.role !== 'owner'" class="text-xs text-muted-foreground">Only the team owner can change the plan.</p>
    </template>
  </div>
</template>
