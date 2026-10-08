<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

const { data: session } = await useAuthSession()

async function signOut() {
  await authClient.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <NuxtLink to="/app" class="font-semibold tracking-tight">social-radar</NuxtLink>
        <div class="flex items-center gap-3 text-sm">
          <span class="hidden text-muted-foreground sm:inline">{{ session?.user.email }}</span>
          <Button variant="ghost" size="sm" @click="signOut">Sign out</Button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
