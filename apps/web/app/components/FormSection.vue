<script setup lang="ts">
/**
 * One calm group of a long form: icon badge, title and a short line on the
 * left (md+), the fields in a soft card on the right. Stacks on mobile.
 */
import type { Component } from 'vue'

defineProps<{ title: string, description?: string, icon: Component, bare?: boolean }>()
</script>

<template>
  <section class="grid grid-cols-1 gap-3 md:grid-cols-[14rem_1fr] md:gap-8">
    <div class="flex items-start gap-3 md:flex-col md:pt-1">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-foreground" aria-hidden="true">
        <component :is="icon" class="size-4.5" />
      </span>
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="flex flex-wrap items-center gap-2 font-semibold tracking-tight">{{ title }}<slot name="badge" /></h2>
        <p v-if="description || $slots.description" class="text-sm text-pretty text-muted-foreground"><slot name="description">{{ description }}</slot></p>
      </div>
    </div>
    <div v-if="bare" class="min-w-0"><slot /></div>
    <div v-else class="min-w-0 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5"><slot /></div>
  </section>
</template>
