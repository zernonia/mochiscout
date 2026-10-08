<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DialogPanelProps extends PrimitiveProps {
  scrollFade?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<DialogPanelProps>(), {
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
          'p-6 in-[[data-slot=dialog-popup]:has([data-slot=dialog-header])]:pt-1 in-[[data-slot=dialog-popup]:has([data-slot=dialog-footer]:not(.border-t))]:pb-1',
          props.class,
        )
      "
      data-slot="dialog-panel"
    >
      <slot />
    </Primitive>
  </ScrollArea>
</template>
