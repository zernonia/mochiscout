<script setup lang="ts">
import {
  CollapsibleTrigger as CollapsibleTriggerPrimitive,
  useForwardProps,
  type CollapsibleTriggerProps as CollapsibleTriggerPrimitiveProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface CollapsibleTriggerProps extends CollapsibleTriggerPrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<CollapsibleTriggerProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <CollapsibleTriggerPrimitive
    v-bind="forwarded"
    :class="cn(props.class)"
    data-slot="collapsible-trigger"
  >
    <slot />
  </CollapsibleTriggerPrimitive>
</template>
