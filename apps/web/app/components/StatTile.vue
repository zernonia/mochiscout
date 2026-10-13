<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  icon?: Component
  tone?: 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'info'
  to?: string
  /** Small trend line under the number (oldest first). */
  trend?: number[]
}>(), { tone: 'neutral' })

const toneClass = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand-soft text-brand-foreground',
  good: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/14 text-amber-700 dark:text-amber-400',
  bad: 'bg-red-500/12 text-red-700 dark:text-red-400',
  info: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
}
const lineClass = {
  neutral: 'text-muted-foreground/60',
  brand: 'text-brand',
  good: 'text-emerald-500',
  warn: 'text-amber-500',
  bad: 'text-red-500',
  info: 'text-sky-500',
}
const showTrend = computed(() => (props.trend?.length ?? 0) > 1)
</script>

<template>
  <component
    :is="to ? resolveComponent('NuxtLink') : 'div'"
    :to="to"
    class="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-3.5 shadow-xs/5 sm:p-4"
    :class="to && 'transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-sm'"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-muted-foreground">{{ label }}</span>
      <span v-if="icon" class="flex size-8 items-center justify-center rounded-xl" :class="toneClass[tone]">
        <component :is="icon" class="size-4" />
      </span>
    </div>
    <div class="flex items-end justify-between gap-3">
      <div class="text-3xl font-semibold tracking-tight tabular-nums">{{ value }}</div>
      <Sparkline v-if="showTrend" :values="trend!" class="mb-1 h-8 w-20 shrink-0" :class="lineClass[tone]" />
    </div>
    <div v-if="hint || $slots.default" class="text-xs text-muted-foreground"><slot>{{ hint }}</slot></div>
  </component>
</template>
