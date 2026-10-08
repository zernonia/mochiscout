<script setup lang="ts">
import {
  CollapsibleContent,
  useForwardProps,
  type CollapsibleContentProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps extends CollapsibleContentProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<CollapsiblePanelProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <CollapsibleContent
    v-bind="forwarded"
    :class="
      cn(
        'overflow-hidden duration-200 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up',
        props.class,
      )
    "
    data-slot="collapsible-panel"
  >
    <slot />
  </CollapsibleContent>
</template>
