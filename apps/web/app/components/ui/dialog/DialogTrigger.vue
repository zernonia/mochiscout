<script setup lang="ts">
import { DialogTrigger } from "reka-ui";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  asChild?: boolean;
  as?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <DialogTrigger
    :as="as"
    :as-child="asChild"
    :class="props.class"
    data-slot="dialog-trigger"
  >
    <slot />
  </DialogTrigger>
</template>
