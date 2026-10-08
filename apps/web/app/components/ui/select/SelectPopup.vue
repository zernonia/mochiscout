<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from "@lucide/vue";
import {
  SelectContent,
  SelectPortal,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectViewport,
  type SelectContentProps,
  type SelectPortalProps,
} from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

interface SelectPopupProps {
  side?: SelectContentProps["side"];
  sideOffset?: SelectContentProps["sideOffset"];
  align?: SelectContentProps["align"];
  alignOffset?: SelectContentProps["alignOffset"];
  alignItemWithTrigger?: boolean;
  portalProps?: {
    to?: SelectPortalProps["to"];
    disabled?: SelectPortalProps["disabled"];
    defer?: SelectPortalProps["defer"];
  };
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SelectPopupProps>(), {
  side: "bottom",
  sideOffset: 4,
  align: "start",
  alignOffset: 0,
  alignItemWithTrigger: true,
});
</script>

<template>
  <SelectPortal v-bind="portalProps">
    <SelectContent
      v-bind="$attrs"
      :position="alignItemWithTrigger ? 'item-aligned' : 'popper'"
      :side="side"
      :side-offset="sideOffset"
      :align="align"
      :align-offset="alignOffset"
      class="z-50 select-none origin-(--reka-select-content-transform-origin) text-foreground outline-none"
      data-slot="select-popup"
    >
      <SelectScrollUpButton
        class="absolute top-0 z-50 flex h-6 w-full cursor-default items-center justify-center before:pointer-events-none before:absolute before:inset-x-px before:top-px before:h-[200%] before:rounded-t-[calc(var(--radius-lg)-1px)] before:bg-linear-to-b before:from-50% before:from-popover"
        data-slot="select-scroll-up-arrow"
      >
        <ChevronUpIcon class="relative size-4.5 sm:size-4" />
      </SelectScrollUpButton>
      <div
        class="relative flex h-full min-w-(--reka-select-trigger-width) flex-col rounded-lg border bg-popover not-dark:bg-clip-padding shadow-lg/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
      >
        <SelectViewport
          :class="
            cn(
              'max-h-(--reka-select-content-available-height) overflow-y-auto p-1',
              props.class,
            )
          "
          data-slot="select-list"
        >
          <slot />
        </SelectViewport>
      </div>
      <SelectScrollDownButton
        class="absolute bottom-0 z-50 flex h-6 w-full cursor-default items-center justify-center before:pointer-events-none before:absolute before:inset-x-px before:bottom-px before:h-[200%] before:rounded-b-[calc(var(--radius-lg)-1px)] before:bg-linear-to-t before:from-50% before:from-popover"
        data-slot="select-scroll-down-arrow"
      >
        <ChevronDownIcon class="relative size-4.5 sm:size-4" />
      </SelectScrollDownButton>
    </SelectContent>
  </SelectPortal>
</template>
