<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <caption
    :class="
      cn('in-data-[variant=card]:my-4 mt-4 text-muted-foreground text-sm', props.class)
    "
    data-slot="table-caption"
  >
    <slot />
  </caption>
</template>
