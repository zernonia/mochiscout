<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { alertVariants, type AlertVariants } from ".";

const props = defineProps<{
  variant?: AlertVariants["variant"];
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    :class="cn(alertVariants({ class: props.class, variant }))"
    data-slot="alert"
    role="alert"
  >
    <slot />
  </div>
</template>
