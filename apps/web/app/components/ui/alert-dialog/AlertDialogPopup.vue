<script setup lang="ts">
import { AlertDialogContent, AlertDialogPortal } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import AlertDialogBackdrop from "./AlertDialogBackdrop.vue";
import AlertDialogViewport from "./AlertDialogViewport.vue";

defineOptions({ inheritAttrs: false });

interface AlertDialogPopupProps {
  bottomStickOnMobile?: boolean;
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<AlertDialogPopupProps>(), {
  bottomStickOnMobile: true,
});
</script>

<template>
  <AlertDialogPortal v-bind="portalProps">
    <AlertDialogBackdrop />
    <AlertDialogViewport
      :class="
        cn(
          bottomStickOnMobile &&
            'max-sm:grid-rows-[1fr_auto] max-sm:p-0 max-sm:pt-12',
        )
      "
    >
      <AlertDialogContent
        v-bind="$attrs"
        :class="
          cn(
            'relative row-start-2 flex max-h-full min-h-0 w-full min-w-0 max-w-lg origin-center flex-col rounded-2xl border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 duration-200 ease-in-out will-change-transform before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:data-[state=closed]:zoom-out-98 sm:data-[state=open]:zoom-in-98 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
            bottomStickOnMobile &&
              'max-sm:max-w-none max-sm:origin-bottom max-sm:rounded-none max-sm:border-x-0 max-sm:border-t max-sm:border-b-0 max-sm:data-[state=closed]:slide-out-to-bottom-4 max-sm:data-[state=open]:slide-in-from-bottom-4 max-sm:before:hidden max-sm:before:rounded-none',
            props.class,
          )
        "
        data-slot="alert-dialog-popup"
      >
        <slot />
      </AlertDialogContent>
    </AlertDialogViewport>
  </AlertDialogPortal>
</template>
