<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeVariants } from ".";

interface BadgeProps extends PrimitiveProps {
  variant?: BadgeVariants["variant"];
  size?: BadgeVariants["size"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<BadgeProps>(), {
  as: "span",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(badgeVariants({ class: props.class, size, variant }))"
    data-slot="badge"
  >
    <slot />
  </Primitive>
</template>
