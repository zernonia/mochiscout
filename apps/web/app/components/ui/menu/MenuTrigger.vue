<script setup lang="ts">
import {
  DropdownMenuTrigger,
  useForwardProps,
  type DropdownMenuTriggerProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";

interface MenuTriggerProps extends DropdownMenuTriggerProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<MenuTriggerProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuTrigger
    v-bind="forwarded"
    :class="props.class"
    data-slot="menu-trigger"
  >
    <slot />
  </DropdownMenuTrigger>
</template>
