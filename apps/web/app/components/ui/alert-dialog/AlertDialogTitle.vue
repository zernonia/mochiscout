<script setup lang="ts">
import { AlertDialogTitle } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <AlertDialogTitle
    :class="cn('font-heading font-semibold text-xl leading-none', props.class)"
    data-slot="alert-dialog-title"
  >
    <slot />
  </AlertDialogTitle>
</template>
