<script setup lang="ts">
// Neutral source marks (letters, not brand logos).
const props = defineProps<{ source: 'reddit' | 'hn' | 'bluesky' | 'x', size?: 'sm' | 'md' }>()
const marks = {
  reddit: { label: 'Reddit', letter: 'r/', class: 'bg-orange-500 text-white' },
  hn: { label: 'Hacker News', letter: 'Y', class: 'bg-orange-400 text-white' },
  bluesky: { label: 'Bluesky', letter: 'b', class: 'bg-sky-500 text-white' },
  x: { label: 'X', letter: '𝕏', class: 'bg-neutral-900 text-white' },
}
const mark = computed(() => marks[props.source])
</script>

<template>
  <span
    :title="mark.label"
    class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none ring-2 ring-background"
    :class="[mark.class, size === 'sm' ? 'size-5 text-[10px]' : 'size-8 text-xs']"
  >
    {{ mark.letter }}<span class="sr-only"> {{ mark.label }}</span>
  </span>
</template>
