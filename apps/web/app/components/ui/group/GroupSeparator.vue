<script setup lang="ts">
import type { SeparatorProps as SeparatorPrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface GroupSeparatorProps extends SeparatorPrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<GroupSeparatorProps>(), {
  orientation: "vertical",
});
</script>

<template>
  <Separator
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'pointer-events-none relative z-2 bg-input before:absolute before:inset-0 has-[+[data-slot=input-control]:focus-within,+[data-slot=input-group]:focus-within,+[data-slot=select-trigger]:focus-visible+*,+[data-slot=number-field]:focus-within]:translate-x-px has-[+[data-slot=input-control]:focus-within,+[data-slot=input-group]:focus-within,+[data-slot=select-trigger]:focus-visible+*,+[data-slot=number-field]:focus-within]:bg-ring dark:before:bg-input/32 [[data-slot=input-control]:focus-within+&,[data-slot=input-group]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&,[data-slot=number-field]:focus-within+&,[data-slot=number-field]:focus-within+input+&]:bg-ring [[data-slot=input-control]:focus-within+&,[data-slot=input-group]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&,[data-slot=number-field]:focus-within+input+&]:-translate-x-px',
        props.class,
      )
    "
    :decorative="decorative"
    :orientation="orientation"
  />
</template>
