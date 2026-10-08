<script setup lang="ts">
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })
useHead({ title: 'Billing · social-radar' })

const route = useRoute()
const [{ data: me, refresh }, { data: catalogue }] = await Promise.all([
  useFetch('/api/me'),
  useFetch('/api/billing/plans'),
])
const busy = ref<string | null>(null)

onMounted(() => {
  if (route.query.checkout === 'success') {
    toast.success('Thanks! Your plan updates as soon as the payment is confirmed.')
    setTimeout(refresh, 4000)
  }
})

async function go(path: '/api/billing/checkout' | '/api/billing/portal', body?: object, key: string = path) {
  busy.value = key
  try {
    const { url } = await $fetch<{ url: string }>(path, { method: 'POST', body })
    window.location.href = url
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
    <h1 class="text-2xl font-semibold tracking-tight">Billing</h1>

    <p v-if="me?.edition !== 'cloud'" class="text-muted-foreground">Self-hosted instances have no plans or limits.</p>

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
              <div class="h-full rounded-full bg-foreground" :style="{ width: `${Math.min(100, (m.used / m.limit) * 100)}%` }" />
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
            @click="go('/api/billing/checkout', { plan: plan.id }, plan.id)"
          >
            {{ busy === plan.id ? 'Opening checkout…' : `Upgrade to ${plan.label}` }}
          </Button>
        </template>
      </PlanCards>
      <p v-if="catalogue && !catalogue.billingConfigured" class="text-xs text-muted-foreground">Billing is not configured on this server (POLAR_* secrets).</p>
      <p v-if="me.role !== 'owner'" class="text-xs text-muted-foreground">Only the team owner can change the plan.</p>
    </template>
  </div>
</template>
