<script setup lang="ts">
import {
  DropdownMenuItem,
  useForwardProps,
  type DropdownMenuItemEmits,
  type DropdownMenuItemProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface MenuLinkItemProps extends DropdownMenuItemProps {
  /** When `false`, clicking the link item will not close the menu. */
  closeOnClick?: boolean;
  inset?: boolean;
  variant?: "default" | "destructive";
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<MenuLinkItemProps>(), {
  as: "a",
  closeOnClick: true,
  variant: "default",
});
const emits = defineEmits<DropdownMenuItemEmits>();

const delegatedProps = computed(() => {
  const { class: _, closeOnClick, inset, variant, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);

function onSelect(event: Event) {
  if (!props.closeOnClick) event.preventDefault();
  emits("select", event);
}
</script>

<template>
  <DropdownMenuItem
    v-bind="forwarded"
    :class="
      cn(
        `flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-inset:ps-8 data-[variant=destructive]:text-destructive-foreground data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-4.5 sm:[&>svg:not([class*='size-'])]:size-4 [&>svg]:pointer-events-none [&>svg]:-mx-0.5 [&>svg]:shrink-0`,
        props.class,
      )
    "
    :data-inset="inset ? '' : undefined"
    data-slot="menu-link-item"
    :data-variant="variant"
    @select="onSelect"
  >
    <slot />
  </DropdownMenuItem>
</template>
