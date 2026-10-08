<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SheetPanelProps extends PrimitiveProps {
  scrollFade?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SheetPanelProps>(), {
  as: "div",
  scrollFade: true,
});
</script>

<template>
  <ScrollArea overscroll-contain :scroll-fade="scrollFade">
    <Primitive
      :as="as"
      :as-child="asChild"
      :class="
        cn(
          'p-6 in-[[data-slot=sheet-popup]:has([data-slot=sheet-header])]:pt-1 in-[[data-slot=sheet-popup]:has([data-slot=sheet-footer]:not(.border-t))]:pb-1',
          props.class,
        )
      "
      data-slot="sheet-panel"
    >
      <slot />
    </Primitive>
  </ScrollArea>
</template>
