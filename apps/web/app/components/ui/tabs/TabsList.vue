<script setup lang="ts">
import {
  injectTabsRootContext,
  TabsIndicator as TabsIndicatorPrimitive,
  TabsList as TabsListPrimitive,
  useForwardProps,
  type TabsListProps as TabsListPrimitiveProps,
} from "reka-ui";
import { computed, provide, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { TabsListSizeKey, type TabsSize, type TabsVariant } from ".";

interface TabsListProps extends TabsListPrimitiveProps {
  variant?: TabsVariant;
  size?: TabsSize;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<TabsListProps>(), {
  size: "default",
  variant: "default",
});

provide(
  TabsListSizeKey,
  computed(() => props.size),
);

const rootContext = injectTabsRootContext();

const delegatedProps = computed(() => {
  const { class: _, variant, size, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <TabsListPrimitive
    v-bind="forwarded"
    :class="
      cn(
        'relative z-0 flex w-fit items-center justify-center gap-x-0.5 text-muted-foreground',
        'data-[orientation=vertical]:flex-col',
        variant === 'default'
          ? 'rounded-lg bg-muted p-0.5 text-muted-foreground/72'
          : 'data-[orientation=vertical]:px-1 data-[orientation=horizontal]:py-1 *:data-[slot=tabs-tab]:hover:bg-accent',
        props.class,
      )
    "
    :data-orientation="rootContext.orientation.value"
    :data-size="size"
    data-slot="tabs-list"
  >
    <slot />
    <TabsIndicatorPrimitive
      :class="
        cn(
          'absolute transition-[width,translate] duration-200 ease-in-out data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:my-auto data-[orientation=horizontal]:h-(--reka-tabs-indicator-thickness) data-[orientation=horizontal]:w-(--reka-tabs-indicator-size) data-[orientation=horizontal]:translate-x-(--reka-tabs-indicator-position) data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-0 data-[orientation=vertical]:mx-auto data-[orientation=vertical]:h-(--reka-tabs-indicator-size) data-[orientation=vertical]:w-(--reka-tabs-indicator-thickness) data-[orientation=vertical]:translate-y-(--reka-tabs-indicator-position)',
          variant === 'underline'
            ? 'z-10 bg-primary data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:w-0.5 data-[orientation=horizontal]:mb-0 data-[orientation=vertical]:ml-0 data-[orientation=vertical]:-translate-x-px data-[orientation=horizontal]:translate-y-px'
            : '-z-1 rounded-md bg-background shadow-sm/5 dark:bg-input',
        )
      "
      :data-orientation="rootContext.orientation.value"
      data-slot="tab-indicator"
    />
  </TabsListPrimitive>
</template>
