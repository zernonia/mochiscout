<script setup lang="ts">
definePageMeta({ layout: 'app' })

const route = useRoute()
const { data: project, error } = await useFetch(() => `/api/projects/${route.params.project}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
useHead({ title: () => `${project.value?.name ?? 'Project'} · social-radar` })

const lists = computed(() => [
  { label: 'Problems it solves', items: project.value?.problems ?? [] },
  { label: 'Keywords', items: project.value?.keywords ?? [] },
  { label: 'Competitors', items: project.value?.competitors ?? [] },
])
</script>

<template>
  <div v-if="project" class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">{{ project.name }}</h1>
      <a :href="project.url" target="_blank" rel="noopener" class="text-sm text-muted-foreground underline">{{ project.url }}</a>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>{{ project.category }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <p v-if="project.icp">{{ project.icp }}</p>
        <div v-for="list in lists" :key="list.label">
          <div class="mb-2 text-sm font-medium">{{ list.label }}</div>
          <div class="flex flex-wrap gap-1.5">
            <Badge v-for="item in list.items" :key="item" variant="secondary">{{ item }}</Badge>
            <span v-if="!list.items.length" class="text-sm text-muted-foreground">None yet</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
