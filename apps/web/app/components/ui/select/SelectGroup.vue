<script setup lang="ts">
import { SelectGroup, useForwardProps, type SelectGroupProps } from "reka-ui";

const props = defineProps<SelectGroupProps>();

const forwarded = useForwardProps(props);
</script>

<template>
  <SelectGroup v-bind="forwarded" data-slot="select-group">
    <slot />
  </SelectGroup>
</template>
