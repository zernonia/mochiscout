<script setup lang="ts">
// The project home is the Today page.
const route = useRoute()
await navigateTo(`/app/${route.params.project}/today`, { replace: true })
</script>

<template>
  <div />
</template>
