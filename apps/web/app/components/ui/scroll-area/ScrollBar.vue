<script setup lang="ts">
import {
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  useForwardProps,
  type ScrollAreaScrollbarProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface ScrollBarProps extends ScrollAreaScrollbarProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<ScrollBarProps>(), {
  orientation: "vertical",
});

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <ScrollAreaScrollbar
    :class="
      cn(
        'm-1 flex opacity-0 transition-opacity delay-300 data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5 data-[orientation=horizontal]:flex-col data-[state=visible]:opacity-100 data-[state=visible]:delay-0 data-[state=visible]:duration-100',
        props.class,
      )
    "
    data-slot="scroll-area-scrollbar"
    v-bind="forwarded"
  >
    <ScrollAreaThumb
      class="relative flex-1 rounded-full bg-foreground/20"
      data-slot="scroll-area-thumb"
    />
  </ScrollAreaScrollbar>
</template>
