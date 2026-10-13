<script setup lang="ts">
// A soft mochi. Decorative only. When `lively`, its eyes follow the pointer
// and it blinks at every click or tap.
const props = withDefaults(defineProps<{ blink?: boolean, outline?: boolean, lively?: boolean }>(), { blink: true, outline: false, lively: false })

/** How far the eyes travel, in viewBox units (the eyes are 9 wide, the face 100). */
const REACH_X = 3.5
const REACH_Y = 2.5

const el = ref<SVGSVGElement>()
const look = ref({ x: 0, y: 0 })
const blinking = ref(false)
let frame = 0
let blinkTimer: ReturnType<typeof setTimeout> | undefined

function lookAt(x: number, y: number) {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const r = el.value?.getBoundingClientRect()
    if (!r?.width) return
    const dx = x - (r.left + r.width / 2)
    const dy = y - (r.top + r.height * 0.52)
    const dist = Math.hypot(dx, dy) || 1
    // Eyes turn fully once the pointer is a couple of mochis away, less when it's close.
    const amount = Math.min(1, dist / (r.width * 2))
    look.value = { x: (dx / dist) * REACH_X * amount, y: (dy / dist) * REACH_Y * amount }
  })
}

function onMove(e: PointerEvent) {
  lookAt(e.clientX, e.clientY)
}

function onDown(e: PointerEvent) {
  lookAt(e.clientX, e.clientY)
  // Restart the blink even when clicks come quickly.
  blinking.value = false
  clearTimeout(blinkTimer)
  requestAnimationFrame(() => {
    blinking.value = true
    blinkTimer = setTimeout(() => { blinking.value = false }, 220)
  })
}

function onLeave() {
  look.value = { x: 0, y: 0 }
}

let listening = false
onMounted(() => {
  if (!props.lively || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  listening = true
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  clearTimeout(blinkTimer)
  if (!listening) return
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerdown', onDown)
  document.documentElement.removeEventListener('pointerleave', onLeave)
})
</script>

<template>
  <svg ref="el" viewBox="0 0 120 84" fill="none" aria-hidden="true" class="mochi">
    <ellipse cx="60" cy="78" rx="44" ry="5" class="fill-black/8" />
    <path
      d="M10 62C10 30 32 8 60 8s50 22 50 54c0 10-8 14-18 14H28c-10 0-18-4-18-14Z"
      class="fill-white"
      :class="outline ? 'stroke-neutral-900' : 'stroke-black/10'"
      :stroke-width="outline ? 6 : 1.5"
    />
    <ellipse cx="34" cy="56" rx="7" ry="4" class="fill-pink-300/50" />
    <ellipse cx="86" cy="56" rx="7" ry="4" class="fill-pink-300/50" />
    <g class="mochi-look" :style="{ transform: `translate(${look.x}px, ${look.y}px)` }">
      <g class="mochi-lids" :class="[blink && 'mochi-eyes', blinking && 'mochi-blink']">
        <ellipse cx="46" cy="44" rx="4.5" ry="6" class="fill-neutral-900" />
        <ellipse cx="74" cy="44" rx="4.5" ry="6" class="fill-neutral-900" />
        <circle cx="47.5" cy="41.5" r="1.4" class="fill-white" />
        <circle cx="75.5" cy="41.5" r="1.4" class="fill-white" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.mochi-look {
  transition: transform 140ms ease-out;
}
.mochi-lids {
  transform-origin: 60px 44px;
}
.mochi-eyes {
  animation: blink 5s infinite;
}
.mochi-lids.mochi-blink {
  animation: blink-once 200ms ease-in-out;
}
@keyframes blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}
@keyframes blink-once {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.1); }
}
@media (prefers-reduced-motion: reduce) {
  .mochi-eyes { animation: none; }
  .mochi-look { transition: none; }
}
</style>
