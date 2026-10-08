<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <kbd
    :class="
      cn(
        'ms-auto font-medium font-sans text-muted-foreground/72 text-xs tracking-widest',
        props.class,
      )
    "
    data-slot="menu-shortcut"
  >
    <slot />
  </kbd>
</template>
