<script setup lang="ts">
import {
  SelectSeparator,
  useForwardProps,
  type SelectSeparatorProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface Props extends SelectSeparatorProps {
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
  <SelectSeparator
    v-bind="forwarded"
    :class="cn('mx-2 my-1 h-px bg-border', props.class)"
    data-slot="select-separator"
  />
</template>
