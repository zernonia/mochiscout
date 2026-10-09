<script setup lang="ts">
// Generic card list placeholder: `lines` text rows per card, laid out in `cols` columns from md up.
withDefaults(defineProps<{ count?: number, lines?: number, cols?: 1 | 2 }>(), { count: 3, lines: 2, cols: 1 })
</script>

<template>
  <div class="grid gap-3" :class="cols === 2 && 'md:grid-cols-2'" aria-hidden="true">
    <div v-for="i in count" :key="i" class="flex items-start gap-3 rounded-xl border bg-card p-4">
      <Skeleton class="size-9 shrink-0 rounded-lg" />
      <div class="flex flex-1 flex-col gap-2">
        <Skeleton class="h-4 w-2/5" />
        <Skeleton v-for="l in lines" :key="l" class="h-3.5" :class="l === lines ? 'w-3/5' : 'w-full'" />
      </div>
    </div>
  </div>
</template>
