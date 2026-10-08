<script setup lang="ts">
import { TooltipTrigger } from "reka-ui";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  asChild?: boolean;
  as?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <TooltipTrigger
    :as="as"
    :as-child="asChild"
    :class="props.class"
    data-slot="tooltip-trigger"
  >
    <slot />
  </TooltipTrigger>
</template>
