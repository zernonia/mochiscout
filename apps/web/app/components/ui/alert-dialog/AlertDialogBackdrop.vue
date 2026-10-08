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
        'fixed inset-0 z-50 bg-black/32 backdrop-blur-sm duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        props.class,
      )
    "
    data-slot="alert-dialog-backdrop"
  >
    <slot />
  </AlertDialogOverlay>
</template>
