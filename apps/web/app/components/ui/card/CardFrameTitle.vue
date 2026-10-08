<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface CardFrameTitleProps extends PrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CardFrameTitleProps>(), {
  as: "div",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn('self-center font-semibold text-sm', props.class)"
    data-slot="card-frame-title"
  >
    <slot />
  </Primitive>
</template>
