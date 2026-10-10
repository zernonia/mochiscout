<script setup lang="ts">
import type { Cell } from '#shared/competitors'
import { CheckIcon, MinusIcon, XIcon } from '@lucide/vue'

defineProps<{ cell: Cell }>()
</script>

<template>
  <div class="flex items-start gap-2">
    <span
      class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
      :class="cell.mark === 'yes' ? 'bg-emerald-500/12 text-emerald-700' : cell.mark === 'partial' ? 'bg-amber-500/15 text-amber-700' : 'bg-neutral-500/10 text-neutral-500'"
    >
      <CheckIcon v-if="cell.mark === 'yes'" class="size-3.5" />
      <MinusIcon v-else-if="cell.mark === 'partial'" class="size-3.5" />
      <XIcon v-else class="size-3.5" />
      <span class="sr-only">{{ cell.mark === 'yes' ? 'Yes' : cell.mark === 'partial' ? 'Partly' : 'No' }}</span>
    </span>
    <span v-if="cell.note" class="text-sm">{{ cell.note }}</span>
  </div>
</template>
