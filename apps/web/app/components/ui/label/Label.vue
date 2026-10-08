<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface LabelProps extends PrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<LabelProps>(), {
  as: "label",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'inline-flex items-center gap-2 font-medium text-base/4.5 text-foreground sm:text-sm/4',
        props.class,
      )
    "
    data-slot="label"
  >
    <slot />
  </Primitive>
</template>
