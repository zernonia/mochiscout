<script setup lang="ts">
import { XIcon } from "@lucide/vue";
import { DialogClose, DialogContent, DialogPortal } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SheetBackdrop from "./SheetBackdrop.vue";
import SheetViewport from "./SheetViewport.vue";

defineOptions({ inheritAttrs: false });

interface SheetPopupProps {
  showCloseButton?: boolean;
  side?: "right" | "left" | "top" | "bottom";
  variant?: "default" | "inset";
  closeProps?: Record<string, unknown>;
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SheetPopupProps>(), {
  showCloseButton: true,
  side: "right",
  variant: "default",
});
</script>

<template>
  <DialogPortal v-bind="portalProps">
    <SheetBackdrop />
    <SheetViewport :side="side" :variant="variant">
      <DialogContent
        v-bind="$attrs"
        :class="
          cn(
            'relative flex max-h-full min-h-0 w-full min-w-0 flex-col bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 duration-200 ease-in-out will-change-transform before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 max-sm:before:hidden dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
            side === 'bottom' &&
              'row-start-2 border-t data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:slide-in-from-bottom-8',
            side === 'top' &&
              'border-b data-[state=closed]:slide-out-to-top-8 data-[state=open]:slide-in-from-top-8',
            side === 'left' &&
              'w-[calc(100%-(--spacing(12)))] max-w-md border-e data-[state=closed]:slide-out-to-left-8 data-[state=open]:slide-in-from-left-8',
            side === 'right' &&
              'col-start-2 w-[calc(100%-(--spacing(12)))] max-w-md border-s data-[state=closed]:slide-out-to-right-8 data-[state=open]:slide-in-from-right-8',
            variant === 'inset' &&
              'before:hidden sm:rounded-2xl sm:border sm:before:rounded-[calc(var(--radius-2xl)-1px)] sm:**:data-[slot=sheet-footer]:rounded-b-[calc(var(--radius-2xl)-1px)]',
            props.class,
          )
        "
        data-slot="sheet-popup"
      >
        <slot />
        <DialogClose
          v-if="showCloseButton"
          aria-label="Close"
          as-child
          class="absolute end-2 top-2"
          v-bind="closeProps"
        >
          <Button size="icon" variant="ghost">
            <XIcon />
          </Button>
        </DialogClose>
      </DialogContent>
    </SheetViewport>
  </DialogPortal>
</template>
