<script setup lang="ts">
import type { CheckReport } from '@social-radar/core'

defineProps<{ report: CheckReport | null }>()

const icon = { pass: '✓', warn: '!', fail: '✕' } as const
const color = { pass: 'text-muted-foreground', warn: 'text-amber-600 dark:text-amber-400', fail: 'text-destructive' } as const
const label = { pass: 'Ready to post', warn: 'Check before posting', fail: 'Fix before posting' } as const
</script>

<template>
  <div v-if="report" class="flex flex-col gap-3 rounded-xl border p-4">
    <div class="flex items-center gap-2 font-medium" :class="color[report.level]">
      <span aria-hidden="true">{{ icon[report.level] }}</span> {{ label[report.level] }}
    </div>
    <ul class="flex flex-col gap-1.5 text-sm">
      <li v-for="r in report.results.filter(r => r.level !== 'pass')" :key="r.id" class="flex gap-2" :class="color[r.level]">
        <span aria-hidden="true" class="w-3 shrink-0">{{ icon[r.level] }}</span><span>{{ r.message }}</span>
      </li>
      <template v-if="report.tone">
        <li v-for="(issue, i) in report.tone.issues" :key="`tone-${i}`" class="flex gap-2" :class="color[report.tone.level]">
          <span aria-hidden="true" class="w-3 shrink-0">{{ icon[report.tone.level] }}</span><span>{{ issue }}</span>
        </li>
      </template>
      <li v-for="r in report.results.filter(r => r.level === 'pass')" :key="r.id" class="flex gap-2 text-muted-foreground">
        <span aria-hidden="true" class="w-3 shrink-0">✓</span><span>{{ r.message }}</span>
      </li>
      <li v-if="report.tone && report.tone.level === 'pass'" class="flex gap-2 text-muted-foreground">
        <span aria-hidden="true" class="w-3 shrink-0">✓</span><span>Tone reads like a genuine community post.</span>
      </li>
    </ul>
    <p v-if="!report.tone" class="text-xs text-muted-foreground">Tone not checked yet.</p>
  </div>
</template>
