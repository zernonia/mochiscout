<script setup lang="ts">
import {
  DropdownMenuSeparator,
  useForwardProps,
  type DropdownMenuSeparatorProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface MenuSeparatorProps extends DropdownMenuSeparatorProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<MenuSeparatorProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuSeparator
    v-bind="forwarded"
    :class="cn('mx-2 my-1 h-px bg-border', props.class)"
    data-slot="menu-separator"
  />
</template>
