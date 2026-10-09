<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  icon?: Component
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info'
  to?: string
}>(), { tone: 'neutral' })

const toneClass = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/14 text-amber-700 dark:text-amber-400',
  bad: 'bg-red-500/12 text-red-700 dark:text-red-400',
  info: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
}
</script>

<template>
  <component
    :is="to ? resolveComponent('NuxtLink') : 'div'"
    :to="to"
    class="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs/5 sm:gap-3 sm:p-4"
    :class="to && 'transition-colors hover:bg-accent/50'"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-muted-foreground">{{ label }}</span>
      <span v-if="icon" class="flex size-7 items-center justify-center rounded-md" :class="toneClass[tone]">
        <component :is="icon" class="size-4" />
      </span>
    </div>
    <div class="text-2xl font-semibold tracking-tight tabular-nums">{{ value }}</div>
    <div v-if="hint || $slots.default" class="text-xs text-muted-foreground"><slot>{{ hint }}</slot></div>
  </component>
</template>
