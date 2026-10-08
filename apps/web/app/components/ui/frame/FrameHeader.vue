<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <header
    :class="cn('flex flex-col px-5 py-4', props.class)"
    data-slot="frame-panel-header"
  >
    <slot />
  </header>
</template>
