<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    :class="
      cn(
        'relative flex flex-col rounded-2xl bg-muted/72 p-1',
        '*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-1',
        props.class,
      )
    "
    data-slot="frame"
  >
    <slot />
  </div>
</template>
