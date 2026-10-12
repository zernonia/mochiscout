<script setup lang="ts">
withDefaults(defineProps<{ source: string, secondary?: 'pricing' | 'selfhost' }>(), { secondary: 'pricing' })
const { waitlist } = useRuntimeConfig().public
</script>

<template>
  <LandingWaitlistForm v-if="waitlist" :source="source" />
  <div v-else class="flex flex-wrap items-center justify-center gap-2">
    <Button as-child size="lg" class="rounded-full px-5">
      <NuxtLink to="/login">Try Pro free for 14 days</NuxtLink>
    </Button>
    <Button v-if="secondary === 'pricing'" as-child size="lg" variant="secondary" class="rounded-full px-5">
      <NuxtLink to="/#pricing">See pricing →</NuxtLink>
    </Button>
    <Button v-else as-child size="lg" variant="outline" class="rounded-full px-5">
      <a :href="site.repo" target="_blank" rel="noopener">Self-host it</a>
    </Button>
  </div>
</template>
