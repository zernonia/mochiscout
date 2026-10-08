<script setup lang="ts">
import { AlertDialogOverlay } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <AlertDialogOverlay
    :class="
      cn(
        'fixed inset-0 z-50 grid grid-rows-[1fr_auto_3fr] justify-items-center p-4 duration-200 data-[state=closed]:animate-out',
        props.class,
      )
    "
    data-slot="alert-dialog-viewport"
  >
    <slot />
  </AlertDialogOverlay>
</template>
