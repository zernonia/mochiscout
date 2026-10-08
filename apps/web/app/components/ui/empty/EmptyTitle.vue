<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    :class="cn('font-heading font-semibold text-xl', props.class)"
    data-slot="empty-title"
  >
    <slot />
  </div>
</template>
