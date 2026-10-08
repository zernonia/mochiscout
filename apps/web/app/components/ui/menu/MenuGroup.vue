<script setup lang="ts">
import {
  DropdownMenuGroup,
  useForwardProps,
  type DropdownMenuGroupProps,
} from "reka-ui";

const props = defineProps<DropdownMenuGroupProps>();

const forwarded = useForwardProps(props);
</script>

<template>
  <DropdownMenuGroup v-bind="forwarded" data-slot="menu-group">
    <slot />
  </DropdownMenuGroup>
</template>
