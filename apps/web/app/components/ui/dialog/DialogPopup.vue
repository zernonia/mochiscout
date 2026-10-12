<script setup lang="ts">
import { XIcon } from "@lucide/vue";
import { DialogClose, DialogContent, DialogPortal } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DialogBackdrop from "./DialogBackdrop.vue";
import DialogViewport from "./DialogViewport.vue";

defineOptions({ inheritAttrs: false });

interface DialogPopupProps {
  showCloseButton?: boolean;
  bottomStickOnMobile?: boolean;
  closeProps?: Record<string, unknown>;
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  class?: HTMLAttributes["class"];
  backdropClass?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<DialogPopupProps>(), {
  bottomStickOnMobile: true,
  showCloseButton: true,
});
</script>

<template>
  <DialogPortal v-bind="portalProps">
    <DialogBackdrop :class="props.backdropClass" />
    <DialogViewport
      :class="
        cn(
          bottomStickOnMobile &&
            'max-sm:grid-rows-[1fr_auto] max-sm:p-0 max-sm:pt-12',
        )
      "
    >
      <DialogContent
        v-bind="$attrs"
        :class="
          cn(
            'relative row-start-2 flex max-h-full min-h-0 w-full min-w-0 max-w-lg origin-center flex-col rounded-2xl border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 outline-none duration-200 ease-in-out will-change-transform before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:data-[state=closed]:zoom-out-98 sm:data-[state=open]:zoom-in-98 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
            bottomStickOnMobile &&
              'max-sm:max-w-none max-sm:origin-bottom max-sm:rounded-none max-sm:border-x-0 max-sm:border-t max-sm:border-b-0 max-sm:data-[state=closed]:slide-out-to-bottom-4 max-sm:data-[state=open]:slide-in-from-bottom-4 max-sm:before:hidden max-sm:before:rounded-none',
            props.class,
          )
        "
        data-slot="dialog-popup"
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
    </DialogViewport>
  </DialogPortal>
</template>
