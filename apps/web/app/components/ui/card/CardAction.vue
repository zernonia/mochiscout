<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface CardActionProps extends PrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CardActionProps>(), {
  as: "div",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'col-start-2 row-span-2 row-start-1 inline-flex self-start justify-self-end',
        props.class,
      )
    "
    data-slot="card-action"
  >
    <slot />
  </Primitive>
</template>
