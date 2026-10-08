<script setup lang="ts">
const { data: health, refresh, status } = await useFetch('/api/health')
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">social-radar</h1>
      <p class="text-muted-foreground">Research → Map → Watch → Draft → Track</p>
    </div>
    <pre class="rounded-lg border bg-muted p-4 text-sm">{{ health }}</pre>
    <div>
      <Button :disabled="status === 'pending'" @click="refresh()">Check bindings</Button>
    </div>
  </main>
</template>
