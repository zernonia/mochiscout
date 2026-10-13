<script setup lang="ts">
/** A tiny trend line in the current text color, with a soft fill under it. Decorative: the number next to it says the same thing. */
const props = defineProps<{ values: number[] }>()

const W = 80
const H = 32
const id = useId()
const points = computed(() => {
  const v = props.values
  const max = Math.max(...v, 1)
  const step = v.length > 1 ? W / (v.length - 1) : W
  return v.map((n, i) => [i * step, H - 3 - (n / max) * (H - 6)] as const)
})
const line = computed(() => points.value.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' '))
const area = computed(() => `${line.value} L${W},${H} L0,${H} Z`)
const last = computed(() => points.value.at(-1))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient :id="id" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="currentColor" stop-opacity="0.22" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="area" :fill="`url(#${id})`" />
    <path :d="line" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    <circle v-if="last" :cx="last[0]" :cy="last[1]" r="2.5" fill="currentColor" />
  </svg>
</template>
