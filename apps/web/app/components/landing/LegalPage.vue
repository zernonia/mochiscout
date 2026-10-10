<script setup lang="ts">
const props = defineProps<{ title: string, description: string }>()
// These pages describe the hosted service; self-hosted instances don't have them.
if (useRuntimeConfig().public.edition !== 'cloud') throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
useMarketingSeo({ title: `${props.title} · Mochiscout`, description: props.description, path: useRoute().path })
</script>

<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <main class="mx-auto max-w-2xl px-4 pt-20 pb-24">
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{{ title }}</h1>
      <p class="mt-2 text-sm text-muted-foreground">Last updated {{ site.legalUpdated }}</p>
      <div class="legal mt-10 flex flex-col gap-4 text-[15px] leading-relaxed">
        <slot />
      </div>
    </main>
    <LandingFooter />
  </div>
</template>

<style scoped>
.legal :deep(h2) { margin-top: 1.5rem; font-size: 1.125rem; font-weight: 600; }
.legal :deep(ul) { list-style: disc; padding-inline-start: 1.25rem; display: flex; flex-direction: column; gap: 0.375rem; }
.legal :deep(a) { text-decoration: underline; }
.legal :deep(p), .legal :deep(li) { color: var(--color-muted-foreground); }
.legal :deep(strong) { color: var(--color-foreground); font-weight: 500; }
</style>
