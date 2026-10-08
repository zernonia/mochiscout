<script setup lang="ts">
const props = defineProps<{ projectId: string, name?: string }>()
const route = useRoute()

const links = computed(() => [
  { to: `/app/${props.projectId}/inbox`, label: 'Inbox' },
  { to: `/app/${props.projectId}/subreddits`, label: 'Subreddits' },
  { to: `/app/${props.projectId}`, label: 'Profile' },
])
</script>

<template>
  <div class="flex flex-col gap-3">
    <NuxtLink to="/app" class="text-sm text-muted-foreground">← Projects</NuxtLink>
    <h1 v-if="name" class="text-2xl font-semibold tracking-tight">{{ name }}</h1>
    <nav class="flex gap-1 border-b">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="-mb-px border-b-2 px-3 py-2 text-sm"
        :class="route.path === link.to ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground'"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
