<script setup lang="ts">
// Buying-intent score as a coloured ring: mochi pink = strong, amber = worth a look, grey = weak.
const props = defineProps<{ value: number }>()
const tone = computed(() => props.value >= 80 ? 'strong' : props.value >= 60 ? 'medium' : 'weak')
const label = computed(() => ({ strong: 'Strong intent', medium: 'Some intent', weak: 'Weak intent' })[tone.value])
const circumference = 2 * Math.PI * 16
</script>

<template>
  <div class="relative flex size-11 shrink-0 items-center justify-center" :title="`${label}: ${value}/100`">
    <svg viewBox="0 0 40 40" class="absolute inset-0 -rotate-90">
      <circle cx="20" cy="20" r="16" fill="none" stroke-width="4" class="stroke-black/6" />
      <circle
        cx="20" cy="20" r="16" fill="none" stroke-width="4" stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - Math.min(100, value) / 100)"
        :class="tone === 'strong' ? 'stroke-brand' : tone === 'medium' ? 'stroke-amber-400' : 'stroke-neutral-300'"
      />
    </svg>
    <span class="text-xs font-semibold tabular-nums">{{ value }}</span>
    <span class="sr-only">{{ label }}</span>
  </div>
</template>
