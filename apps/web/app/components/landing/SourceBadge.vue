<script setup lang="ts">
// A platform's official mark on a white disc (overlaps nicely when stacked).
const props = defineProps<{ source: 'reddit' | 'hn' | 'bluesky' | 'x', size?: 'sm' | 'md' }>()
const label = computed(() => ({ reddit: 'Reddit', hn: 'Hacker News', bluesky: 'Bluesky', x: 'X' })[props.source])
</script>

<template>
  <span
    :title="label"
    class="inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-xs/5 ring-1 ring-black/8"
    :class="size === 'sm' ? 'size-5' : 'size-8'"
  >
    <BrandIcon :platform="source" :class="[size === 'sm' ? 'size-3' : 'size-4.5', source === 'hn' && 'rounded-[3px]']" />
  </span>
</template>
