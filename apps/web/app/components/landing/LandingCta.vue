<script setup lang="ts">
withDefaults(defineProps<{ source: string, secondary?: 'pricing' | 'how' | 'selfhost' }>(), { secondary: 'pricing' })
const { waitlist } = useRuntimeConfig().public
</script>

<template>
  <LandingWaitlistForm v-if="waitlist" :source="source" />
  <div v-else class="flex flex-wrap items-center justify-center gap-2">
    <Button as-child size="lg" class="rounded-full bg-brand px-6 text-white shadow-md shadow-brand/25 hover:bg-brand/90">
      <NuxtLink to="/login?mode=signup">Try Pro free for 14 days</NuxtLink>
    </Button>
    <Button v-if="secondary === 'pricing'" as-child size="lg" variant="outline" class="rounded-full px-5">
      <NuxtLink to="/#pricing">See pricing →</NuxtLink>
    </Button>
    <Button v-else-if="secondary === 'how'" as-child size="lg" variant="outline" class="rounded-full px-5">
      <NuxtLink to="/#how">See how it works</NuxtLink>
    </Button>
    <Button v-else as-child size="lg" variant="outline" class="rounded-full px-5">
      <a :href="site.repo" target="_blank" rel="noopener"><GitHubMark /> Self-host it</a>
    </Button>
  </div>
</template>
