<script setup lang="ts">
import { ArrowRightIcon, FolderKanbanIcon, GlobeIcon, PlusIcon } from '@lucide/vue'

definePageMeta({ layout: 'app' })
useHead({ title: 'Projects · Mochiscout' })

const { data: projects } = useCachedFetch('/api/projects')

// A brand-new account has nothing to see here yet: go straight to setting up the first project.
watch(projects, (list) => {
  if (list && !list.length) navigateTo('/app/new', { replace: true })
}, { immediate: true })

function host(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Projects" description="One project per product. Each has its own inbox, subreddits and drafts." :icon="FolderKanbanIcon">
      <template v-if="projects?.length" #actions>
        <Button as-child><NuxtLink to="/app/new"><PlusIcon /> New project</NuxtLink></Button>
      </template>
    </AppPageHeader>

    <SkeletonCards v-if="!projects" :count="2" :lines="1" :cols="2" />
    <AppEmpty v-else-if="!projects.length" title="No projects yet" description="Paste your product URL and we'll find where your buyers talk.">
      <Button as-child><NuxtLink to="/app/new"><PlusIcon /> New project</NuxtLink></Button>
    </AppEmpty>

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="p in projects"
        :key="p.id"
        :to="`/app/${p.id}/today`"
        class="group flex items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-xs/5 transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-sm"
      >
        <SourceAvatar :channel="p.name.trim() || '?'" size="lg" />
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium">{{ p.name }}</div>
          <div class="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <span v-if="p.category" class="max-w-[50%] shrink-0 truncate rounded-full bg-muted px-2 py-px text-xs">{{ p.category }}</span>
            <GlobeIcon class="size-3.5 shrink-0" aria-hidden="true" />
            <span class="truncate">{{ host(p.url) }}</span>
          </div>
        </div>
        <ArrowRightIcon class="size-4 shrink-0 text-muted-foreground transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-brand" />
      </NuxtLink>
      <NuxtLink to="/app/new" class="flex items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft/40 hover:text-brand-foreground">
        <PlusIcon class="size-4" /> New project
      </NuxtLink>
    </div>
  </div>
</template>
