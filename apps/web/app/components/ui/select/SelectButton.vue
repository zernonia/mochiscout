<script setup lang="ts">
import { ChevronsUpDownIcon } from "@lucide/vue";
import { Primitive } from "reka-ui";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import {
  selectTriggerIconClassName,
  selectTriggerVariants,
  type SelectButtonProps,
} from ".";

const props = withDefaults(defineProps<SelectButtonProps>(), {
  as: "button",
});

const typeValue = computed(() =>
  props.asChild || props.as !== "button" ? undefined : (props.type ?? "button"),
);
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(selectTriggerVariants({ size }), 'min-w-0', props.class)"
    data-slot="select-button"
    :type="typeValue"
  >
    <span
      class="flex-1 truncate in-data-placeholder:text-muted-foreground/72"
    >
      <slot />
    </span>
    <ChevronsUpDownIcon :class="selectTriggerIconClassName" />
  </Primitive>
</template>
