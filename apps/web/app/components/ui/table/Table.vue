<script lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";

export type TableVariant = "default" | "card";

export interface TableProps extends PrimitiveProps {
  variant?: TableVariant;
  class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<TableProps>(), {
  as: "div",
  variant: "default",
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    class="relative w-full overflow-x-auto"
    data-slot="table-container"
    :data-variant="variant"
  >
    <table
      :class="
        cn(
          'w-full caption-bottom in-data-[variant=card]:border-separate in-data-[variant=card]:border-spacing-0 text-sm',
          props.class,
        )
      "
      data-slot="table"
      v-bind="$attrs"
    >
      <slot />
    </table>
  </Primitive>
</template>
