<script setup lang="ts">
// A soft mochi with eyes that follow nothing in particular. Decorative only.
withDefaults(defineProps<{ blink?: boolean, outline?: boolean }>(), { blink: true, outline: false })
</script>

<template>
  <svg viewBox="0 0 120 84" fill="none" aria-hidden="true" class="mochi">
    <ellipse cx="60" cy="78" rx="44" ry="5" class="fill-black/8" />
    <path
      d="M10 62C10 30 32 8 60 8s50 22 50 54c0 10-8 14-18 14H28c-10 0-18-4-18-14Z"
      class="fill-white"
      :class="outline ? 'stroke-neutral-900' : 'stroke-black/10'"
      :stroke-width="outline ? 6 : 1.5"
    />
    <ellipse cx="34" cy="56" rx="7" ry="4" class="fill-pink-300/50" />
    <ellipse cx="86" cy="56" rx="7" ry="4" class="fill-pink-300/50" />
    <g :class="blink && 'mochi-eyes'">
      <ellipse cx="46" cy="44" rx="4.5" ry="6" class="fill-neutral-900" />
      <ellipse cx="74" cy="44" rx="4.5" ry="6" class="fill-neutral-900" />
      <circle cx="47.5" cy="41.5" r="1.4" class="fill-white" />
      <circle cx="75.5" cy="41.5" r="1.4" class="fill-white" />
    </g>
  </svg>
</template>

<style scoped>
.mochi-eyes {
  transform-origin: 60px 44px;
  animation: blink 5s infinite;
}
@keyframes blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}
@media (prefers-reduced-motion: reduce) {
  .mochi-eyes { animation: none; }
}
</style>
