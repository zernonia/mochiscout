<script setup lang="ts">
import { onBeforeUnmount, useId, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectField } from "./context";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const field = injectField();
const id = `${useId()}-description`;
if (field) {
  field.descriptionId.value = id;
  onBeforeUnmount(() => {
    if (field.descriptionId.value === id) field.descriptionId.value = undefined;
  });
}
</script>

<template>
  <p
    :class="cn('text-muted-foreground text-xs', props.class)"
    data-slot="field-description"
    :id="field ? id : undefined"
  >
    <slot />
  </p>
</template>
