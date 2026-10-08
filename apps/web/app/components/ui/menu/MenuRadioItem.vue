<script setup lang="ts">
import {
  DropdownMenuItemIndicator,
  DropdownMenuRadioItem,
  useForwardPropsEmits,
  type DropdownMenuRadioItemEmits,
  type DropdownMenuRadioItemProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface MenuRadioItemProps extends DropdownMenuRadioItemProps {
  closeOnClick?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<MenuRadioItemProps>(), {
  closeOnClick: false,
});
const emits = defineEmits<DropdownMenuRadioItemEmits>();

const delegatedProps = computed(() => {
  const { class: _, closeOnClick, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);

function onSelect(event: Event): void {
  if (!props.closeOnClick) event.preventDefault();
}
</script>

<template>
  <DropdownMenuRadioItem
    v-bind="forwarded"
    :class="
      cn(
        `grid min-h-8 in-data-[side=none]:min-w-[calc(var(--reka-dropdown-menu-trigger-width)+1.25rem)] cursor-default grid-cols-[.75rem_1fr] items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0`,
        props.class,
      )
    "
    data-slot="menu-radio-item"
    @select="onSelect"
  >
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
  </DropdownMenuRadioItem>
</template>
