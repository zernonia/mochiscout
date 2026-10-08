<script setup lang="ts">
import {
  CheckboxGroupRoot,
  useForwardPropsEmits,
  type CheckboxGroupRootEmits,
  type CheckboxGroupRootProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectField } from "@/components/ui/field/context";

interface CheckboxGroupProps extends CheckboxGroupRootProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CheckboxGroupProps>(), {
  rovingFocus: false,
});
const emits = defineEmits<CheckboxGroupRootEmits>();

const field = injectField();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <CheckboxGroupRoot
    v-bind="forwarded"
    :aria-invalid="field?.invalid.value ? 'true' : undefined"
    :class="cn('flex flex-col items-start gap-3', props.class)"
  >
    <slot />
  </CheckboxGroupRoot>
</template>
