<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { groupVariants, type GroupVariants } from ".";

const props = defineProps<{
  orientation?: GroupVariants["orientation"];
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    :class="cn(groupVariants({ orientation }), props.class)"
    :data-orientation="orientation"
    data-slot="group"
    role="group"
  >
    <slot />
  </div>
</template>
