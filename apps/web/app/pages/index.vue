<script setup lang="ts">
const { data: session } = await useAuthSession()
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-4">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">social-radar</h1>
      <p class="mt-2 text-muted-foreground">
        Find the people who need your product on Reddit, learn their pain points, and show up helpfully without getting banned.
      </p>
      <p class="mt-1 text-sm text-muted-foreground">Research → Map → Watch → Draft → Track</p>
    </div>
    <div>
      <Button as-child>
        <NuxtLink :to="session ? '/app' : '/login'">{{ session ? 'Open app' : 'Sign in' }}</NuxtLink>
      </Button>
    </div>
  </main>
</template>
