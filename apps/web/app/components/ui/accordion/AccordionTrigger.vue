<script setup lang="ts">
import { ChevronDownIcon } from "@lucide/vue";
import {
  AccordionHeader,
  AccordionTrigger as AccordionTriggerPrimitive,
  useForwardProps,
  type AccordionTriggerProps as AccordionTriggerPrimitiveProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface AccordionTriggerProps extends AccordionTriggerPrimitiveProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<AccordionTriggerProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTriggerPrimitive
      v-bind="forwarded"
      :class="
        cn(
          'flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-md py-4 text-left font-medium text-sm outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-64 data-[state=open]:*:data-[slot=accordion-indicator]:rotate-180',
          props.class,
        )
      "
      data-slot="accordion-trigger"
    >
      <slot />
      <ChevronDownIcon
        class="pointer-events-none size-4 shrink-0 translate-y-0.5 opacity-80 transition-transform duration-200 ease-in-out"
        data-slot="accordion-indicator"
      />
    </AccordionTriggerPrimitive>
  </AccordionHeader>
</template>
