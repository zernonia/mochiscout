<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  type DropdownMenuContentProps,
} from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

interface MenuPopupProps {
  side?: DropdownMenuContentProps["side"];
  align?: DropdownMenuContentProps["align"];
  sideOffset?: DropdownMenuContentProps["sideOffset"];
  alignOffset?: DropdownMenuContentProps["alignOffset"];
  collisionPadding?: DropdownMenuContentProps["collisionPadding"];
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<MenuPopupProps>(), {
  align: "center",
  side: "bottom",
  sideOffset: 4,
});
</script>

<template>
  <DropdownMenuPortal v-bind="portalProps">
    <DropdownMenuContent
      v-bind="$attrs"
      :align="align"
      :align-offset="alignOffset"
      :collision-padding="collisionPadding"
      :class="
        cn(
          `relative z-50 flex not-[class*='w-']:min-w-32 origin-(--reka-dropdown-menu-content-transform-origin) rounded-lg border bg-popover not-dark:bg-clip-padding shadow-lg/5 outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] focus:outline-none dark:before:shadow-[0_-1px_--theme(--color-white/6%)]`,
          props.class,
        )
      "
      data-slot="menu-popup"
      :side="side"
      :side-offset="sideOffset"
    >
      <div
        class="max-h-(--reka-dropdown-menu-content-available-height) w-full overflow-y-auto p-1"
      >
        <slot />
      </div>
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
