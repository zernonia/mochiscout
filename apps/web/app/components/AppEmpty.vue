<script setup lang="ts">
/** Empty state with the mochi: friendlier than an icon in a dashed box. */
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
    <LandingMochiMascot class="h-14 w-20" />
    <div class="flex max-w-md flex-col gap-1">
      <h2 class="font-semibold">{{ title }}</h2>
      <p v-if="description || $slots.description" class="text-sm text-pretty text-muted-foreground"><slot name="description">{{ description }}</slot></p>
    </div>
    <div v-if="$slots.default" class="mt-1 flex flex-wrap justify-center gap-2"><slot /></div>
  </div>
</template>
