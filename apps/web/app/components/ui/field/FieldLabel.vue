<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectField } from "./context";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const field = injectField();
</script>

<template>
  <label
    :class="
      cn(
        'inline-flex items-center gap-2 font-medium text-base/4.5 text-foreground data-disabled:opacity-64 sm:text-sm/4',
        props.class,
      )
    "
    data-slot="field-label"
    :for="field?.controlId.value"
    :id="field?.labelId.value"
    v-bind="field?.dataAttrs.value"
  >
    <slot />
  </label>
</template>
