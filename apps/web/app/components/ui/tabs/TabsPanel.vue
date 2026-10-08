<script setup lang="ts">
import {
  TabsContent,
  useForwardProps,
  type TabsContentProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface TabsPanelProps extends TabsContentProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<TabsPanelProps>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <TabsContent
    v-bind="forwarded"
    :class="cn('flex-1 outline-none', props.class)"
    data-slot="tabs-content"
  >
    <slot />
  </TabsContent>
</template>
