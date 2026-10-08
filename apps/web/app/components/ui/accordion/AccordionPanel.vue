<script setup lang="ts">
import {
  AccordionContent,
  useForwardProps,
  type AccordionContentProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface AccordionPanelProps extends AccordionContentProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<AccordionPanelProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <AccordionContent
    v-bind="forwarded"
    class="overflow-hidden text-muted-foreground text-sm duration-200 ease-in-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
    data-slot="accordion-panel"
  >
    <div :class="cn('pt-0 pb-4', props.class)">
      <slot />
    </div>
  </AccordionContent>
</template>
