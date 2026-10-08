<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  type TooltipContentProps,
} from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

interface TooltipPopupProps {
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  sideOffset?: TooltipContentProps["sideOffset"];
  collisionPadding?: TooltipContentProps["collisionPadding"];
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<TooltipPopupProps>(), {
  align: "center",
  side: "top",
  sideOffset: 4,
});
</script>

<template>
  <TooltipPortal v-bind="portalProps">
    <TooltipContent
      v-bind="$attrs"
      :align="align"
      :collision-padding="collisionPadding"
      :class="
        cn(
          'relative z-50 flex origin-(--reka-tooltip-content-transform-origin) text-balance rounded-md border bg-popover not-dark:bg-clip-padding text-popover-foreground text-xs shadow-md/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] animate-in fade-in-0 zoom-in-98 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 data-[state=instant-open]:duration-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
          props.class,
        )
      "
      data-slot="tooltip-popup"
      :side="side"
      :side-offset="sideOffset"
    >
      <div
        class="relative size-full overflow-clip px-(--viewport-inline-padding) py-1 [--viewport-inline-padding:--spacing(2)]"
        data-slot="tooltip-viewport"
      >
        <slot />
      </div>
    </TooltipContent>
  </TooltipPortal>
</template>
