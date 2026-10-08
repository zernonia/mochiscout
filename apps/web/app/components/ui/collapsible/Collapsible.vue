<script setup lang="ts">
import {
  CollapsibleRoot,
  useForwardPropsEmits,
  type CollapsibleRootEmits,
  type CollapsibleRootProps,
} from "reka-ui";

const props = defineProps<CollapsibleRootProps>();
const emits = defineEmits<CollapsibleRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <CollapsibleRoot v-bind="forwarded" data-slot="collapsible">
    <slot />
  </CollapsibleRoot>
</template>
