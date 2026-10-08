<script setup lang="ts">
import { DialogTitle } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <DialogTitle
    :class="cn('font-heading font-semibold text-xl leading-none', props.class)"
    data-slot="dialog-title"
  >
    <slot />
  </DialogTitle>
</template>
