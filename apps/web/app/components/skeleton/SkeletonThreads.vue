<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 3 })
</script>

<template>
  <div class="flex flex-col gap-3" aria-hidden="true">
    <div v-for="i in count" :key="i" class="flex gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <Skeleton class="hidden size-11 shrink-0 rounded-full sm:block" />
      <div class="flex flex-1 flex-col gap-3">
        <div class="flex gap-2"><Skeleton class="h-5 w-28 rounded-full" /><Skeleton class="h-5 w-16" /><Skeleton class="h-5 w-12" /></div>
        <Skeleton class="h-5 w-3/4" />
        <div class="flex flex-col gap-1.5"><Skeleton class="h-3.5 w-full" /><Skeleton class="h-3.5 w-5/6" /></div>
        <Skeleton class="h-16 w-full rounded-lg" />
        <div class="flex gap-2"><Skeleton class="h-8 w-28 rounded-lg" /><Skeleton class="h-8 w-20 rounded-lg" /><Skeleton class="h-8 w-16 rounded-lg" /></div>
      </div>
    </div>
  </div>
</template>
