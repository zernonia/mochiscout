<script setup lang="ts">
import { provide, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { FIELD_INJECTION_KEY, injectField } from "./context";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const field = injectField();

if (field) {
  const itemId = useId();
  provide(FIELD_INJECTION_KEY, {
    ...field,
    controlId: ref(`${itemId}-control`),
    labelId: ref(`${itemId}-label`),
  });
}
</script>

<template>
  <div :class="cn('flex', props.class)" data-slot="field-item">
    <slot />
  </div>
</template>
