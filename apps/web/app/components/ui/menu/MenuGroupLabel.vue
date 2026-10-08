<script setup lang="ts">
import {
  DropdownMenuLabel,
  useForwardProps,
  type DropdownMenuLabelProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface MenuGroupLabelProps extends DropdownMenuLabelProps {
  inset?: boolean;
  class?: HTMLAttributes["class"];
}

const props = defineProps<MenuGroupLabelProps>();

const delegatedProps = computed(() => {
  const { class: _, inset, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuLabel
    v-bind="forwarded"
    :class="
      cn(
        'px-2 py-1.5 font-medium text-muted-foreground text-xs data-inset:ps-9 sm:data-inset:ps-8',
        props.class,
      )
    "
    :data-inset="inset ? '' : undefined"
    data-slot="menu-label"
  >
    <slot />
  </DropdownMenuLabel>
</template>
