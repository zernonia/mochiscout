<script setup lang="ts">
import { SelectValue, useForwardProps, type SelectValueProps } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface Props extends SelectValueProps {
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
  <SelectValue
    v-bind="forwarded"
    :class="
      cn('flex-1 truncate data-placeholder:text-muted-foreground', props.class)
    "
    data-slot="select-value"
  >
    <template v-if="$slots.default" #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </SelectValue>
</template>
