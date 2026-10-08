<script setup lang="ts">
import { ChevronsUpDownIcon } from "@lucide/vue";
import {
  SelectIcon,
  SelectTrigger,
  useForwardProps,
  type SelectTriggerProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import {
  selectTriggerIconClassName,
  selectTriggerVariants,
  type SelectTriggerVariants,
} from ".";

interface Props extends SelectTriggerProps {
  size?: SelectTriggerVariants["size"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { size: "default" });

const delegatedProps = computed(() => {
  const { class: _, size: __, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <SelectTrigger
    v-bind="forwarded"
    :class="cn(selectTriggerVariants({ size }), props.class)"
    data-slot="select-trigger"
  >
    <slot />
    <SelectIcon data-slot="select-icon">
      <ChevronsUpDownIcon :class="selectTriggerIconClassName" />
    </SelectIcon>
  </SelectTrigger>
</template>
