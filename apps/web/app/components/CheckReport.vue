<script setup lang="ts">
import type { CheckReport } from '@mochiscout/core'
import { CheckIcon, TriangleAlertIcon, XIcon } from '@lucide/vue'

defineProps<{ report: CheckReport | null }>()

const icon = { pass: CheckIcon, warn: TriangleAlertIcon, fail: XIcon } as const
const color = { pass: 'text-muted-foreground', warn: 'text-amber-600 dark:text-amber-400', fail: 'text-destructive' } as const
const label = { pass: 'Ready to post', warn: 'Check before posting', fail: 'Fix before posting' } as const
const tint = { pass: 'border-emerald-500/20 bg-emerald-500/5', warn: 'border-amber-500/25 bg-amber-500/6', fail: 'border-red-500/20 bg-red-500/5' } as const
const headColor = { pass: 'text-emerald-700 dark:text-emerald-400', warn: 'text-amber-700 dark:text-amber-400', fail: 'text-destructive' } as const
</script>

<template>
  <div v-if="report" class="flex flex-col gap-3 rounded-2xl border p-4" :class="tint[report.level]">
    <div class="flex items-center gap-2 font-medium" :class="headColor[report.level]">
      <span aria-hidden="true" class="flex size-6 items-center justify-center rounded-full bg-current/12"><component :is="icon[report.level]" class="size-3.5" /></span> {{ label[report.level] }}
    </div>
    <ul class="flex flex-col gap-1.5 text-sm">
      <li v-for="r in report.results.filter(r => r.level !== 'pass')" :key="r.id" class="flex gap-2" :class="color[r.level]">
        <component :is="icon[r.level]" aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" /><span>{{ r.message }}</span>
      </li>
      <template v-if="report.tone">
        <li v-for="(issue, i) in report.tone.issues" :key="`tone-${i}`" class="flex gap-2" :class="color[report.tone.level]">
          <component :is="icon[report.tone.level]" aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" /><span>{{ issue }}</span>
        </li>
      </template>
      <li v-for="r in report.results.filter(r => r.level === 'pass')" :key="r.id" class="flex gap-2 text-muted-foreground">
        <CheckIcon aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" /><span>{{ r.message }}</span>
      </li>
      <li v-if="report.tone && report.tone.level === 'pass'" class="flex gap-2 text-muted-foreground">
        <CheckIcon aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" /><span>Tone reads like a genuine community post.</span>
      </li>
    </ul>
    <p v-if="!report.tone" class="text-xs text-muted-foreground">Tone not checked yet.</p>
  </div>
</template>
