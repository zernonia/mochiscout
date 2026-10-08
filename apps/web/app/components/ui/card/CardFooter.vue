<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface CardFooterProps extends PrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CardFooterProps>(), {
  as: "div",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'flex items-center p-6 in-[[data-slot=card]:has(>[data-slot=card-panel])]:pt-4',
        props.class,
      )
    "
    data-slot="card-footer"
  >
    <slot />
  </Primitive>
</template>
