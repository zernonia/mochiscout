<script setup lang="ts">
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItemIndicator,
  useForwardPropsEmits,
  type DropdownMenuCheckboxItemEmits,
  type DropdownMenuCheckboxItemProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface MenuCheckboxItemProps extends DropdownMenuCheckboxItemProps {
  variant?: "default" | "switch";
  closeOnClick?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<MenuCheckboxItemProps>(), {
  variant: "default",
  closeOnClick: false,
});
const emits = defineEmits<DropdownMenuCheckboxItemEmits>();

const delegatedProps = computed(() => {
  const { class: _, variant, closeOnClick, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);

function onSelect(event: Event): void {
  if (!props.closeOnClick) event.preventDefault();
}
</script>

<template>
  <DropdownMenuCheckboxItem
    v-bind="forwarded"
    :class="
      cn(
        `grid min-h-8 in-data-[side=none]:min-w-[calc(var(--reka-dropdown-menu-trigger-width)+1.25rem)] cursor-default items-center gap-2 rounded-sm py-1 ps-2 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0`,
        variant === 'switch'
          ? 'grid-cols-[1fr_auto] gap-4 pe-1.5'
          : 'grid-cols-[.75rem_1fr] pe-4',
        props.class,
      )
    "
    data-slot="menu-checkbox-item"
    @select="onSelect"
  >
    <template v-if="variant === 'switch'">
      <span class="col-start-1"><slot /></span>
      <DropdownMenuItemIndicator
        class="inset-shadow-[0_1px_--theme(--color-black/4%)] inline-flex h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)] shrink-0 items-center rounded-full p-px outline-none transition-[background-color,box-shadow] duration-200 [--thumb-size:--spacing(4)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-disabled:opacity-64 sm:[--thumb-size:--spacing(3)]"
        force-mount
      >
        <span
          class="pointer-events-none block aspect-square h-full in-[[data-slot=menu-checkbox-item][data-state=checked]]:origin-[var(--thumb-size)_50%] origin-left in-[[data-slot=menu-checkbox-item][data-state=checked]]:translate-x-[calc(var(--thumb-size)-4px)] in-[[data-slot=menu-checkbox-item]:active]:not-data-disabled:scale-x-110 in-[[data-slot=menu-checkbox-item]:active]:rounded-[var(--thumb-size)/calc(var(--thumb-size)*1.10)] rounded-(--thumb-size) bg-background shadow-sm/5 will-change-transform [transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s]"
        />
      </DropdownMenuItemIndicator>
    </template>
    <template v-else>
      <DropdownMenuItemIndicator class="col-start-1 -ms-0.5">
        <svg
          aria-hidden="true"
          fill="none"
          height="24"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </DropdownMenuItemIndicator>
      <span class="col-start-2"><slot /></span>
    </template>
  </DropdownMenuCheckboxItem>
</template>
