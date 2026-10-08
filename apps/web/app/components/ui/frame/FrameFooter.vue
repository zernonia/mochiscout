<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <footer :class="cn('px-5 py-4', props.class)" data-slot="frame-panel-footer">
    <slot />
  </footer>
</template>
