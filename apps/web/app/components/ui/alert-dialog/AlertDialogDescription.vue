<script setup lang="ts">
import { AlertDialogDescription } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <AlertDialogDescription
    :class="cn('text-muted-foreground text-sm', props.class)"
    data-slot="alert-dialog-description"
  >
    <slot />
  </AlertDialogDescription>
</template>
