<script setup lang="ts">
import {
  injectTooltipProviderContext,
  TooltipProvider,
  TooltipRoot,
  useForwardPropsEmits,
  type TooltipRootEmits,
  type TooltipRootProps,
} from "reka-ui";

const props = defineProps<TooltipRootProps>();
const emits = defineEmits<TooltipRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);

const providerContext = injectTooltipProviderContext(null);
</script>

<template>
  <TooltipRoot v-if="providerContext" v-bind="forwarded">
    <slot />
  </TooltipRoot>
  <TooltipProvider v-else>
    <TooltipRoot v-bind="forwarded">
      <slot />
    </TooltipRoot>
  </TooltipProvider>
</template>
