<script setup lang="ts">
import type { Cell } from '#shared/competitors'
import { CheckIcon, MinusIcon, XIcon } from '@lucide/vue'

const props = defineProps<{ cell: Cell, inverted?: boolean }>()
// For risky features (posting for you), "yes" is shown as a warning and "no" as good.
const tone = computed(() => {
  const good = props.inverted ? props.cell.mark === 'no' : props.cell.mark === 'yes'
  const bad = props.inverted ? props.cell.mark === 'yes' : props.cell.mark === 'no'
  return good ? 'good' : bad ? (props.inverted ? 'risk' : 'none') : 'partial'
})
</script>

<template>
  <div class="flex items-start gap-2">
    <span
      class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
      :class="{ good: 'bg-emerald-500/12 text-emerald-700', partial: 'bg-amber-500/15 text-amber-700', risk: 'bg-red-500/12 text-red-700', none: 'bg-neutral-500/10 text-neutral-500' }[tone]"
    >
      <CheckIcon v-if="cell.mark === 'yes'" class="size-3.5" />
      <MinusIcon v-else-if="cell.mark === 'partial'" class="size-3.5" />
      <XIcon v-else class="size-3.5" />
      <span class="sr-only">{{ cell.mark === 'yes' ? 'Yes' : cell.mark === 'partial' ? 'Partly' : 'No' }}</span>
    </span>
    <span v-if="cell.note" class="text-sm">{{ cell.note }}</span>
  </div>
</template>
