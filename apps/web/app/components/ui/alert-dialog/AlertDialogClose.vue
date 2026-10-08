<script setup lang="ts">
import { AlertDialogCancel } from "reka-ui";

defineProps<{
  asChild?: boolean;
  as?: string;
}>();
</script>

<template>
  <AlertDialogCancel :as="as" :as-child="asChild" data-slot="alert-dialog-close">
    <slot />
  </AlertDialogCancel>
</template>
