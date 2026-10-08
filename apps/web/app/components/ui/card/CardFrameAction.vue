<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface CardFrameActionProps extends PrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CardFrameActionProps>(), {
  as: "div",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'col-start-2 nth-3:row-span-2 nth-3:row-start-1 inline-flex self-center justify-self-end',
        props.class,
      )
    "
    data-slot="card-frame-action"
  >
    <slot />
  </Primitive>
</template>
