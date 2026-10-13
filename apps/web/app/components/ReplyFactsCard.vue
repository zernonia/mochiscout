<script setup lang="ts">
import { BadgeCheckIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

/**
 * What only the founder knows. Drafts may only state true things, so
 * without this they fall back to general advice; with it they can share a
 * real story, number or difference.
 */
const props = defineProps<{ projectId: string, productName: string }>()

const { data } = useCachedFetch(() => `/api/projects/${props.projectId}/reply-instructions`)
const text = ref('')
watch(data, (d) => { if (d) text.value = d.facts ?? '' }, { immediate: true })
const MAX = 3000
const dirty = computed(() => text.value.trim() !== (data.value?.facts ?? '').trim())
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    const res = await $fetch(`/api/projects/${props.projectId}/reply-instructions`, { method: 'PUT', body: { facts: text.value } })
    text.value = res.facts
    if (data.value) Object.assign(data.value, { facts: res.facts })
    toast.success(res.facts ? 'Saved. New drafts can use these.' : 'Cleared.')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not save'))
  }
  finally {
    saving.value = false
  }
}

const placeholder = `Why you built it: "I kept missing launches in Slack, so…"
Real numbers: "40 teams use it", "setup takes 2 minutes"
Pricing and offers: "Free up to 3 projects, $19/month after"
How it differs: "Unlike Beamer, it emails users on each release"
Who it's not for: "Not built for enterprise SSO"`
</script>

<template>
  <FormSection title="What only you know" description="Real details make replies specific instead of generic." :icon="BadgeCheckIcon">
    <template v-if="data && !data.facts" #badge>
      <span class="rounded-full bg-amber-500/14 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">Empty</span>
    </template>
    <form class="flex flex-col gap-3" @submit.prevent="save">
      <p class="text-sm text-pretty text-muted-foreground">
        Drafts only say things that are true, so without these they fall back on general advice. Add your story, numbers, pricing and how {{ productName }} differs. One per line is fine; each reply uses the one or two that fit.
      </p>
      <Textarea v-model="text" rows="7" :maxlength="MAX" :placeholder="placeholder" class="text-sm leading-relaxed" aria-label="What only you know" />
      <div class="flex items-center gap-2">
        <Button type="submit" size="sm" :loading="saving" :disabled="!dirty">Save</Button>
        <span class="ms-auto text-xs text-muted-foreground tabular-nums">{{ text.length }}/{{ MAX }}</span>
      </div>
    </form>
  </FormSection>
</template>
