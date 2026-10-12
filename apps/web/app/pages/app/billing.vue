<script setup lang="ts">
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
const subscribed = computed(() => me.value?.org.plan === 'solo' || me.value?.org.plan === 'pro')
const priceOf = (id: string) => catalogue.value?.plans.find(p => p.id === id)?.price ?? 0

function planAction(id: string, label: string) {
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
      { label: 'Projects', used: me.value.usage.projects, limit: me.value.limits.projects },
      { label: 'Watched subreddits', used: me.value.usage.watchedSubreddits, limit: me.value.limits.watchedSubreddits },
      { label: 'Research runs this month', used: me.value.usage.researchRuns, limit: me.value.limits.manualResearchPerMonth },
    ]
  : [])
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Billing" description="Your plan, what you have used this month, and upgrades." />

    <template v-if="!me">
      <Skeleton class="h-36 w-full rounded-xl" />
      <div class="grid gap-4 md:grid-cols-3"><Skeleton v-for="i in 3" :key="i" class="h-72 rounded-xl" /></div>
    </template>
    <p v-else-if="me.edition !== 'cloud'" class="text-muted-foreground">Self-hosted instances have no plans or limits.</p>

    <template v-else-if="me">
      <Card>
        <CardHeader>
          <CardTitle>{{ me.limits.label }} plan</CardTitle>
          <CardDescription v-if="me.org.plan !== 'free'">
            <template v-if="me.org.planStatus === 'past_due'">Payment failed: update your card in Manage billing. </template>
            <template v-else-if="me.org.planStatus === 'canceled'">Cancelled; active until the end of the period. </template>
            <template v-if="me.org.currentPeriodEnd">Current period ends {{ new Date(me.org.currentPeriodEnd).toLocaleDateString() }}.</template>
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <div v-for="m in meters" :key="m.label" class="flex flex-col gap-1.5">
            <div class="flex justify-between text-sm">
              <span>{{ m.label }}</span>
              <span class="tabular-nums text-muted-foreground">{{ m.used }}{{ m.limit !== null ? ` / ${m.limit}` : '' }}</span>
            </div>
            <div v-if="m.limit" class="h-1.5 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full" :class="m.used >= m.limit ? 'bg-amber-500' : 'bg-foreground'" :style="{ width: `${Math.min(100, (m.used / m.limit) * 100)}%` }" />
            </div>
          </div>
          <Button
            v-if="me.org.plan !== 'free' && me.role === 'owner'"
            variant="outline"
            class="self-start"
            :disabled="!!busy"
            @click="go('/api/billing/portal')"
          >
            {{ busy === '/api/billing/portal' ? 'Opening…' : 'Manage billing' }}
          </Button>
        </CardContent>
      </Card>

      <PlanCards v-if="catalogue" :plans="catalogue.plans" :current="me.org.plan" :highlight="String(route.query.plan ?? '')">
        <template #action="{ plan }">
          <Button
            v-if="plan.id !== 'free' && plan.id !== me.org.plan && me.role === 'owner'"
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
