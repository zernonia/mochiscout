export { TabsRoot as TabsPrimitive } from "reka-ui";

import type { ComputedRef, InjectionKey } from "vue";
import type { SegmentedControlSize } from "@/lib/segmented-control";

export type TabsVariant = "default" | "underline";
export type TabsSize = SegmentedControlSize;

export const TabsListSizeKey: InjectionKey<ComputedRef<TabsSize>> =
  Symbol("TabsListSize");

export { default as Tabs } from "./Tabs.vue";
export { default as TabsList } from "./TabsList.vue";
export { default as TabsPanel } from "./TabsPanel.vue";
export { default as TabsContent } from "./TabsPanel.vue";
export { default as TabsTab } from "./TabsTab.vue";
export { default as TabsTrigger } from "./TabsTab.vue";
