<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Projects · social-radar' })

const { data: me } = await useFetch('/api/me')
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
      <p class="text-muted-foreground">Signed in as {{ me?.user.email }} · plan {{ me?.org.plan }}</p>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>No projects yet</CardTitle>
        <CardDescription>Paste your product URL to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled>New project (next step)</Button>
      </CardContent>
    </Card>
  </div>
</template>
