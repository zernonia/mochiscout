<script setup lang="ts">
import {
  AccordionItem as AccordionItemPrimitive,
  useForwardProps,
  type AccordionItemProps as AccordionItemPrimitiveProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface AccordionItemProps extends AccordionItemPrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<AccordionItemProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <AccordionItemPrimitive
    v-bind="forwarded"
    :class="cn('border-b last:border-b-0', props.class)"
    data-slot="accordion-item"
  >
    <slot />
  </AccordionItemPrimitive>
</template>
