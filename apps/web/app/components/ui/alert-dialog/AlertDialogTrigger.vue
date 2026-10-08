<script setup lang="ts">
import { AlertDialogTrigger } from "reka-ui";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  asChild?: boolean;
  as?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <AlertDialogTrigger
    :as="as"
    :as-child="asChild"
    :class="props.class"
    data-slot="alert-dialog-trigger"
  >
    <slot />
  </AlertDialogTrigger>
</template>
