<script setup lang="ts">
import { ArrowRightIcon, FolderPlusIcon, PlusIcon } from '@lucide/vue'

definePageMeta({ layout: 'app' })
useHead({ title: 'Projects · Mochiscout' })

const { data: projects } = useCachedFetch('/api/projects')

function host(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Projects" description="One project per product. Each has its own inbox, subreddits and drafts.">
      <template v-if="projects?.length" #actions>
        <Button as-child><NuxtLink to="/app/new"><PlusIcon /> New project</NuxtLink></Button>
      </template>
    </AppPageHeader>

    <SkeletonCards v-if="!projects" :count="2" :lines="1" :cols="2" />
    <Empty v-else-if="!projects.length" class="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FolderPlusIcon /></EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Paste your product URL and we'll find where your buyers talk.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child><NuxtLink to="/app/new"><PlusIcon /> New project</NuxtLink></Button>
      </EmptyContent>
    </Empty>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="p in projects"
        :key="p.id"
        :to="`/app/${p.id}/today`"
        class="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs/5 transition-colors hover:bg-accent/50"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 font-semibold text-white">{{ p.name.trim()[0]?.toUpperCase() }}</span>
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium">{{ p.name }}</div>
          <div class="truncate text-sm text-muted-foreground">{{ p.category ? `${p.category} · ` : '' }}{{ host(p.url) }}</div>
        </div>
        <ArrowRightIcon class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </NuxtLink>
      <NuxtLink to="/app/new" class="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
        <PlusIcon class="size-4" /> New project
      </NuxtLink>
    </div>
  </div>
</template>
