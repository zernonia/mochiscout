<script setup lang="ts">
import { RotateCcwIcon, ShieldCheckIcon, SparklesIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

const props = defineProps<{ projectId: string, productName: string }>()

const { data } = useCachedFetch(() => `/api/projects/${props.projectId}/reply-instructions`)
const text = ref(data.value?.instructions ?? '')
const isDefault = ref(data.value?.isDefault ?? true)
watch(data, (d) => {
  if (!d) return
  text.value = d.instructions
  isDefault.value = d.isDefault
}, { immediate: true })
const MAX = 4000
const dirty = computed(() => text.value !== data.value?.instructions)
const saving = ref(false)

async function save(instructions: string | null) {
  saving.value = true
  try {
    const res = await $fetch(`/api/projects/${props.projectId}/reply-instructions`, { method: 'PUT', body: { instructions } })
    text.value = res.instructions
    isDefault.value = res.isDefault
    if (data.value) Object.assign(data.value, { instructions: res.instructions, isDefault: res.isDefault })
    toast.success(res.isDefault ? 'Using the default instructions' : 'Reply instructions saved. New drafts will follow them.')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not save the instructions'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Card id="reply-instructions" class="scroll-mt-6">
    <CardContent class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="flex items-center gap-2 font-semibold">
            <SparklesIcon class="size-4 text-violet-600 dark:text-violet-400" /> Reply instructions
            <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="isDefault ? 'bg-muted text-muted-foreground' : 'bg-violet-500/12 text-violet-700 dark:text-violet-400'">{{ isDefault ? 'Default' : 'Custom' }}</span>
          </h2>
          <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
            How AI drafts should reply for you: tone, when to mention {{ productName }}, what to avoid. Write <code class="rounded bg-muted px-1 text-xs">{product}</code> for the product name.
          </p>
        </div>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="save(text)">
        <Textarea v-model="text" rows="10" :maxlength="MAX" class="font-mono text-[13px] leading-relaxed" aria-label="Reply instructions" />
        <div class="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" :loading="saving" :disabled="!dirty">Save instructions</Button>
          <Button v-if="!isDefault || dirty" type="button" size="sm" variant="ghost" :disabled="saving" @click="save(null)"><RotateCcwIcon /> Reset to default</Button>
          <span class="ms-auto text-xs text-muted-foreground tabular-nums">{{ text.length }}/{{ MAX }}</span>
        </div>
      </form>

      <div class="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <ShieldCheckIcon class="mt-0.5 size-4 shrink-0" />
        <p>
          Always applied, whatever the instructions say: each community's rules (which win over your instructions), the platform's length and style,
          your voice from replies you posted, and no invented facts or customer stories. You review and post every reply yourself.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
