<script setup lang="ts">
import {
  TabsTrigger as TabsTriggerPrimitive,
  useForwardProps,
  type TabsTriggerProps as TabsTriggerPrimitiveProps,
} from "reka-ui";
import { computed, inject, type HTMLAttributes } from "vue";
import {
  segmentedControlItemLayoutClassName,
  segmentedControlItemSizeClassNames,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";
import { TabsListSizeKey, type TabsSize } from ".";

interface TabsTabProps extends TabsTriggerPrimitiveProps {
  size?: TabsSize;
  class?: HTMLAttributes["class"];
}

const props = defineProps<TabsTabProps>();

const contextSize = inject(TabsListSizeKey, undefined);
const resolvedSize = computed<TabsSize>(
  () => props.size ?? contextSize?.value ?? "default",
);

const delegatedProps = computed(() => {
  const { class: _, size, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <TabsTriggerPrimitive
    v-bind="forwarded"
    :class="
      cn(
        `relative flex shrink-0 grow cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-transparent font-medium text-base outline-none transition-[color,background-color,box-shadow] hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring data-disabled:pointer-events-none data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start data-[state=active]:text-foreground data-disabled:opacity-64 sm:text-sm`,
        segmentedControlItemLayoutClassName,
        segmentedControlItemSizeClassNames[resolvedSize],
        props.class,
      )
    "
    :data-size="resolvedSize"
    data-slot="tabs-tab"
  >
    <slot />
  </TabsTriggerPrimitive>
</template>
