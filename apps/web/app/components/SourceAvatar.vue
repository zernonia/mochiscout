<script setup lang="ts">
/**
 * A soft, colored avatar for where a thread lives: the subreddit's initial
 * on a pastel picked from its name, or the platform's mark.
 */
const props = withDefaults(defineProps<{ channel?: string | null, platform?: string | null, size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const PASTELS = [
  'bg-pink-100 text-pink-700',
  'bg-rose-100 text-rose-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-800',
  'bg-lime-100 text-lime-800',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
]
const PLATFORM: Record<string, { label: string, class: string }> = {
  hn: { label: 'Y', class: 'bg-orange-500 text-white' },
  bluesky: { label: '🦋', class: 'bg-sky-100 text-sky-700' },
  x: { label: '𝕏', class: 'bg-neutral-900 text-white' },
  web: { label: '◎', class: 'bg-muted text-muted-foreground' },
}

const look = computed(() => {
  if (props.channel) {
    let h = 0
    for (const ch of props.channel.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return { label: props.channel.replace(/^r\//i, '').charAt(0).toUpperCase(), class: PASTELS[h % PASTELS.length]! }
  }
  return PLATFORM[props.platform ?? 'web'] ?? PLATFORM.web!
})
const sizeClass = { sm: 'size-6 text-[11px] rounded-lg', md: 'size-9 text-sm rounded-xl', lg: 'size-11 text-base rounded-2xl' }
</script>

<template>
  <span class="flex shrink-0 items-center justify-center font-semibold select-none" :class="[look.class, sizeClass[size]]" aria-hidden="true">{{ look.label }}</span>
</template>
