<script setup lang="ts">
import { DialogClose } from "reka-ui";

defineProps<{
  asChild?: boolean;
  as?: string;
}>();
</script>

<template>
  <DialogClose :as="as" :as-child="asChild" data-slot="sheet-close">
    <slot />
  </DialogClose>
</template>
