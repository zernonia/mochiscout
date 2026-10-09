<script setup lang="ts">
const { user, clear } = useUserSession()
const edition = useRuntimeConfig().public.edition
const { data: orgs } = await useFetch('/api/orgs')

async function switchOrg(orgId: unknown) {
  await $fetch('/api/orgs/active', { method: 'POST', body: { orgId: String(orgId) } })
  // Projects belong to teams: start from the project list of the new team.
  window.location.href = '/app'
}
useSeoMeta({ robots: 'noindex' })

async function signOut() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div class="flex min-w-0 items-center gap-3">
          <NuxtLink to="/app" class="font-semibold tracking-tight">Mochiscout</NuxtLink>
          <Select
            v-if="orgs && orgs.length > 1"
            :model-value="orgs.find(o => o.active)?.id"
            @update:model-value="switchOrg"
          >
            <SelectTrigger aria-label="Team" size="sm" class="max-w-44 min-w-0"><SelectValue class="truncate" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in orgs" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="hidden text-muted-foreground sm:inline">{{ user?.email }}</span>
          <Button v-if="edition === 'cloud'" as-child variant="ghost" size="sm">
            <NuxtLink to="/app/billing">Billing</NuxtLink>
          </Button>
          <Button as-child variant="ghost" size="sm">
            <NuxtLink to="/app/settings">Settings</NuxtLink>
          </Button>
          <Button variant="ghost" size="sm" @click="signOut">Sign out</Button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-6">
      <slot />
    </main>
    <UpgradeSheet />
  </div>
</template>
