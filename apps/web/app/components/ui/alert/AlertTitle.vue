<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    :class="cn('font-medium [svg~&]:col-start-2', props.class)"
    data-slot="alert-title"
  >
    <slot />
  </div>
</template>
