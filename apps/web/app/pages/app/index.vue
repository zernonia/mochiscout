<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Projects · social-radar' })

const { data: projects } = await useFetch('/api/projects')
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
      <Button v-if="projects?.length" as-child size="sm">
        <NuxtLink to="/app/new">New project</NuxtLink>
      </Button>
    </div>

    <Card v-if="!projects?.length">
      <CardHeader>
        <CardTitle>No projects yet</CardTitle>
        <CardDescription>Paste your product URL to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button as-child>
          <NuxtLink to="/app/new">New project</NuxtLink>
        </Button>
      </CardContent>
    </Card>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <NuxtLink v-for="p in projects" :key="p.id" :to="`/app/${p.id}/today`" class="rounded-xl border p-4 transition-colors hover:bg-muted">
        <div class="font-medium">{{ p.name }}</div>
        <div class="truncate text-sm text-muted-foreground">{{ p.category || p.url }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
