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
        'flex flex-col gap-2 p-6 text-center max-sm:pb-4 sm:text-left',
        props.class,
      )
    "
    data-slot="alert-dialog-header"
  >
    <slot />
  </div>
</template>
