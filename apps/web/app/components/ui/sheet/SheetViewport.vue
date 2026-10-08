<script setup lang="ts">
import { DialogOverlay } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    side?: "right" | "left" | "top" | "bottom";
    variant?: "default" | "inset";
    class?: HTMLAttributes["class"];
  }>(),
  {
    variant: "default",
  },
);
</script>

<template>
  <DialogOverlay
    :class="
      cn(
        'fixed inset-0 z-50 grid duration-200 data-[state=closed]:animate-out',
        side === 'bottom' && 'grid grid-rows-[1fr_auto] pt-12',
        side === 'top' && 'grid grid-rows-[auto_1fr] pb-12',
        side === 'left' && 'flex justify-start',
        side === 'right' && 'flex justify-end',
        variant === 'inset' && 'sm:p-4',
        props.class,
      )
    "
    data-slot="sheet-viewport"
  >
    <slot />
  </DialogOverlay>
</template>
