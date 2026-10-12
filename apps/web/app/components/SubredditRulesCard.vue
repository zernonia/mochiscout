<script setup lang="ts">
import { ExternalLinkIcon, RefreshCwIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

interface Rules {
  promo_policy: 'none' | 'weekly_thread_only' | 'flair_only' | 'allowed_with_value' | 'allowed'
  self_promo_thread: string | null
  min_karma: number | null
  min_account_age_days: number | null
  cooldown_days: number | null
  notes: string
  official?: { title: string, text: string, kind: 'all' | 'link' | 'comment' }[]
}

const props = defineProps<{
  projectId: string
  name: string
  rules: Rules | null
  source: 'official' | 'curated' | 'auto' | null
  checkedAt: string | Date | null
  watching: boolean
}>()
const emit = defineEmits<{ updated: [] }>()

const promo: Record<Rules['promo_policy'], { label: string, class: string }> = {
  none: { label: 'No promotion', class: 'border-red-500/30 bg-red-500/8 text-red-700 dark:text-red-400' },
  weekly_thread_only: { label: 'Promo thread only', class: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' },
  flair_only: { label: 'Promo flair only', class: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' },
  allowed_with_value: { label: 'Promo if valuable', class: 'border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-400' },
  allowed: { label: 'Promo allowed', class: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400' },
}

const checked = computed(() => props.checkedAt
  ? new Date(props.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : null)
const rulesUrl = computed(() => `https://www.reddit.com/r/${props.name}/about/rules`)

const checking = ref(false)
async function recheck() {
  checking.value = true
  try {
    const res = await $fetch<{ read: boolean }>(`/api/projects/${props.projectId}/subreddits/${props.name}/rules`, { method: 'POST' })
    toast.success(res.read ? `Read r/${props.name}'s rules` : `r/${props.name}'s rules were checked a few minutes ago`)
    emit('updated')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not read the rules'))
  }
  finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-1.5 text-sm">
    <template v-if="rules">
      <div class="flex flex-wrap gap-1.5">
        <span class="rounded-full border px-2 py-0.5 text-xs font-medium" :class="promo[rules.promo_policy]?.class">{{ promo[rules.promo_policy]?.label }}</span>
        <Badge v-if="rules.cooldown_days" variant="outline">1 mention / {{ rules.cooldown_days }} days</Badge>
        <Badge v-if="rules.min_karma != null" variant="outline">{{ rules.min_karma }}+ karma</Badge>
        <Badge v-if="rules.min_account_age_days != null" variant="outline">{{ rules.min_account_age_days }}+ day account</Badge>
        <Badge v-if="rules.self_promo_thread" variant="outline">{{ rules.self_promo_thread }}</Badge>
      </div>
      <p v-if="rules.notes" class="text-xs text-muted-foreground">{{ rules.notes }}</p>
      <details v-if="rules.official?.length" class="group text-xs">
        <summary class="cursor-pointer text-muted-foreground hover:text-foreground">Read all {{ rules.official.length }} rules</summary>
        <ol class="mt-2 flex list-decimal flex-col gap-2 pl-4">
          <li v-for="r in rules.official" :key="r.title">
            <span class="font-medium">{{ r.title }}</span>
            <span v-if="r.kind !== 'all'" class="text-muted-foreground"> ({{ r.kind === 'link' ? 'posts' : 'comments' }})</span>
            <p v-if="r.text" class="mt-0.5 whitespace-pre-line text-muted-foreground">{{ r.text }}</p>
          </li>
        </ol>
      </details>
    </template>
    <p v-else class="text-xs text-muted-foreground">
      {{ watching && !checkedAt ? `Reading r/${name}'s rules…` : `Couldn't find r/${name}'s rules yet. Read them before posting.` }}
    </p>

    <div class="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
      <span v-if="source === 'official'">From r/{{ name }}'s official rules<template v-if="checked">, checked {{ checked }}</template></span>
      <span v-else-if="source === 'curated'">From our reviewed rules list</span>
      <span v-else-if="source === 'auto'">Read from the sub's pinned posts<template v-if="checked">, {{ checked }}</template></span>
      <a :href="rulesUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-0.5 underline">On Reddit <ExternalLinkIcon class="size-3" /></a>
      <button type="button" class="inline-flex items-center gap-1 underline disabled:opacity-50" :disabled="checking" @click="recheck">
        <RefreshCwIcon class="size-3" :class="checking && 'animate-spin'" /> {{ checking ? 'Checking…' : 'Re-check' }}
      </button>
    </div>
  </div>
</template>
