<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { emptyMediaVariants, type EmptyMediaVariants } from ".";

const props = withDefaults(
  defineProps<{
    variant?: EmptyMediaVariants["variant"];
    class?: HTMLAttributes["class"];
  }>(),
  {
    variant: "default",
  },
);
</script>

<template>
  <div
    :class="cn('relative mb-6', props.class)"
    data-slot="empty-media"
    :data-variant="variant"
  >
    <template v-if="variant === 'icon'">
      <div
        aria-hidden="true"
        :class="
          cn(
            emptyMediaVariants({ class: props.class, variant }),
            'pointer-events-none absolute bottom-px origin-bottom-left -translate-x-0.5 -rotate-10 scale-84 shadow-none',
          )
        "
      />
      <div
        aria-hidden="true"
        :class="
          cn(
            emptyMediaVariants({ class: props.class, variant }),
            'pointer-events-none absolute bottom-px origin-bottom-right translate-x-0.5 rotate-10 scale-84 shadow-none',
          )
        "
      />
    </template>
    <div :class="cn(emptyMediaVariants({ class: props.class, variant }))">
      <slot />
    </div>
  </div>
</template>
