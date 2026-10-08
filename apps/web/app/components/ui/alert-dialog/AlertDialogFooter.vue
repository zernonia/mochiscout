<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "bare";
    class?: HTMLAttributes["class"];
  }>(),
  {
    variant: "default",
  },
);
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end sm:rounded-b-[calc(var(--radius-2xl)-1px)]',
        variant === 'default' && 'border-t bg-muted/72 py-4',
        variant === 'bare' && 'pb-6',
        props.class,
      )
    "
    data-slot="alert-dialog-footer"
  >
    <slot />
  </div>
</template>
