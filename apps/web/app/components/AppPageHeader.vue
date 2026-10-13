<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ title: string, description?: string, icon?: Component }>()
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex min-w-0 items-start gap-3.5">
      <span v-if="icon" class="mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-foreground ring-1 ring-brand/10 sm:flex" aria-hidden="true">
        <component :is="icon" class="size-5" />
      </span>
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
        <p v-if="description" class="max-w-2xl text-sm text-pretty text-muted-foreground">{{ description }}</p>
        <slot name="meta" />
      </div>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
