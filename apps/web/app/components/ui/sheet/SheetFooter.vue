<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface SheetFooterProps extends PrimitiveProps {
  variant?: "default" | "bare";
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SheetFooterProps>(), {
  as: "div",
  variant: "default",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end',
        variant === 'default' && 'border-t bg-muted/72 py-4',
        variant === 'bare' &&
          'in-[[data-slot=sheet-popup]:has([data-slot=sheet-panel])]:pt-3 pt-4 pb-6',
        props.class,
      )
    "
    data-slot="sheet-footer"
  >
    <slot />
  </Primitive>
</template>
