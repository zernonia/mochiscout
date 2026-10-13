<script setup lang="ts">
// The project home is the Today page.
definePageMeta({ redirect: to => `/app/${String(to.params.project)}/today` })
</script>

<template>
  <div />
</template>
