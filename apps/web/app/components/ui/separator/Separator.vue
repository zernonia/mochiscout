<script setup lang="ts">
import {
  Separator as SeparatorPrimitive,
  type SeparatorProps as SeparatorPrimitiveProps,
} from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface SeparatorProps extends SeparatorPrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SeparatorProps>(), {
  orientation: "horizontal",
});
</script>

<template>
  <SeparatorPrimitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        `shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`,
        props.class,
      )
    "
    data-slot="separator"
    :decorative="decorative"
    :orientation="orientation"
  />
</template>
