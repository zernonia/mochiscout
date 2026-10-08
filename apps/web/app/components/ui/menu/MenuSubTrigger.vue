<script setup lang="ts">
import { ChevronRightIcon } from "@lucide/vue";
import {
  DropdownMenuSubTrigger,
  useForwardProps,
  type DropdownMenuSubTriggerProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface MenuSubTriggerProps extends DropdownMenuSubTriggerProps {
  inset?: boolean;
  class?: HTMLAttributes["class"];
}

const props = defineProps<MenuSubTriggerProps>();

const delegatedProps = computed(() => {
  const { class: _, inset, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuSubTrigger
    v-bind="forwarded"
    :class="
      cn(
        `flex min-h-8 items-center gap-2 rounded-sm px-2 py-1 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-[state=open]:bg-accent data-inset:ps-8 data-highlighted:text-accent-foreground data-[state=open]:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&>svg:not(:last-child)]:-mx-0.5 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none`,
        props.class,
      )
    "
    :data-inset="inset ? '' : undefined"
    data-slot="menu-sub-trigger"
  >
    <slot />
    <ChevronRightIcon class="ms-auto -me-0.5 opacity-80" />
  </DropdownMenuSubTrigger>
</template>
