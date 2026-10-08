<script setup lang="ts">
import { SelectLabel, useForwardProps, type SelectLabelProps } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface Props extends SelectLabelProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <SelectLabel
    v-bind="forwarded"
    :class="
      cn('px-2 py-1.5 font-medium text-muted-foreground text-xs', props.class)
    "
    data-slot="select-group-label"
  >
    <slot />
  </SelectLabel>
</template>
