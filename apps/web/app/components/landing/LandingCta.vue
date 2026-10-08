<script setup lang="ts">
defineProps<{ source: string }>()
const { waitlist } = useRuntimeConfig().public
</script>

<template>
  <LandingWaitlistForm v-if="waitlist" :source="source" />
  <div v-else class="flex flex-wrap gap-2">
    <Button as-child size="lg">
      <NuxtLink to="/login">Start free</NuxtLink>
    </Button>
    <Button as-child size="lg" variant="outline">
      <a href="https://github.com/zernonia/social-radar" target="_blank" rel="noopener">Self-host it</a>
    </Button>
  </div>
</template>
