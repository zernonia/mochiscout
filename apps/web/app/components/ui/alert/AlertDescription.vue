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
        'flex flex-col gap-2.5 text-muted-foreground [svg~&]:col-start-2',
        props.class,
      )
    "
    data-slot="alert-description"
  >
    <slot />
  </div>
</template>
