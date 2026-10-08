<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaViewport,
  useForwardProps,
  type ScrollAreaRootProps,
} from "reka-ui";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type HTMLAttributes,
} from "vue";
import { cn } from "@/lib/utils";
import ScrollBar from "./ScrollBar.vue";

interface ScrollAreaProps extends ScrollAreaRootProps {
  scrollFade?: boolean;
  scrollbarGutter?: boolean;
  fill?: boolean;
  clampContentMinWidth?: boolean;
  overscrollContain?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<ScrollAreaProps>(), {
  clampContentMinWidth: true,
  fill: false,
  overscrollContain: false,
  scrollFade: false,
  scrollbarGutter: false,
});

const delegatedProps = computed(() => {
  const {
    class: _,
    scrollFade,
    scrollbarGutter,
    fill,
    clampContentMinWidth,
    overscrollContain,
    ...delegated
  } = props;
  return delegated;
});
const forwarded = useForwardProps(delegatedProps);

const contentEl = ref<HTMLElement>();
let observer: ResizeObserver | undefined;

function getViewport(): HTMLElement | null {
  return (
    contentEl.value?.closest<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    ) ?? null
  );
}

function updateOverflow(): void {
  const viewport = getViewport();
  if (!viewport) return;
  const yStart = viewport.scrollTop;
  const yEnd = viewport.scrollHeight - viewport.clientHeight - yStart;
  const xStart = Math.abs(viewport.scrollLeft);
  const xEnd = viewport.scrollWidth - viewport.clientWidth - xStart;
  viewport.style.setProperty("--scroll-area-overflow-y-start", `${yStart}px`);
  viewport.style.setProperty(
    "--scroll-area-overflow-y-end",
    `${Math.max(yEnd, 0)}px`,
  );
  viewport.style.setProperty("--scroll-area-overflow-x-start", `${xStart}px`);
  viewport.style.setProperty(
    "--scroll-area-overflow-x-end",
    `${Math.max(xEnd, 0)}px`,
  );
  viewport.toggleAttribute(
    "data-has-overflow-y",
    viewport.scrollHeight > viewport.clientHeight,
  );
  viewport.toggleAttribute(
    "data-has-overflow-x",
    viewport.scrollWidth > viewport.clientWidth,
  );
}

onMounted(() => {
  const viewport = getViewport();
  if (!viewport) return;
  viewport.addEventListener("scroll", updateOverflow, { passive: true });
  observer = new ResizeObserver(updateOverflow);
  observer.observe(viewport);
  if (contentEl.value) observer.observe(contentEl.value);
  updateOverflow();
});

onBeforeUnmount(() => {
  getViewport()?.removeEventListener("scroll", updateOverflow);
  observer?.disconnect();
});
</script>

<template>
  <ScrollAreaRoot
    v-bind="forwarded"
    :class="cn('flex size-full min-h-0 flex-col', props.class)"
  >
    <ScrollAreaViewport
      :class="
        cn(
          'h-full flex-1 rounded-[inherit] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          overscrollContain &&
            'data-has-overflow-y:overscroll-y-contain data-has-overflow-x:overscroll-x-contain',
          scrollFade &&
            'mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))] [--fade-size:1.5rem]',
          scrollbarGutter &&
            'data-has-overflow-y:pe-2.5 data-has-overflow-x:pb-2.5',
        )
      "
      data-slot="scroll-area-viewport"
    >
      <div
        ref="contentEl"
        :class="cn(fill && 'size-full')"
        data-slot="scroll-area-content"
        :style="clampContentMinWidth ? { minWidth: '0' } : undefined"
      >
        <slot />
      </div>
    </ScrollAreaViewport>
    <ScrollBar orientation="vertical" />
    <ScrollBar orientation="horizontal" />
    <ScrollAreaCorner data-slot="scroll-area-corner" />
  </ScrollAreaRoot>
</template>
