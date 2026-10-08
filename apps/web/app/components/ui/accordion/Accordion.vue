<script setup lang="ts">
import {
  AccordionRoot,
  useForwardProps,
  type AccordionRootProps,
} from "reka-ui";
import { computed } from "vue";

interface AccordionProps
  extends Omit<
    AccordionRootProps,
    "modelValue" | "defaultValue" | "type" | "collapsible"
  > {
  modelValue?: string[];
  defaultValue?: string[];
  multiple?: boolean;
}

const props = withDefaults(defineProps<AccordionProps>(), {
  multiple: true,
});

const emits = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const delegatedProps = computed(() => {
  const { defaultValue, modelValue, multiple, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);

/** Reka takes a scalar in single mode; `""` keeps an empty selection controlled. */
const rekaModelValue = computed<string | string[] | undefined>(() => {
  if (props.modelValue === undefined) return undefined;
  return props.multiple ? props.modelValue : (props.modelValue[0] ?? "");
});

const rekaDefaultValue = computed<string | string[] | undefined>(() => {
  if (props.defaultValue === undefined) return undefined;
  return props.multiple ? props.defaultValue : props.defaultValue[0];
});

function onUpdate(payload: string | string[] | undefined): void {
  emits(
    "update:modelValue",
    Array.isArray(payload) ? payload : payload ? [payload] : [],
  );
}
</script>

<template>
  <AccordionRoot
    v-bind="forwarded"
    collapsible
    data-slot="accordion"
    :default-value="rekaDefaultValue"
    :model-value="rekaModelValue"
    :type="multiple ? 'multiple' : 'single'"
    @update:model-value="onUpdate"
  >
    <slot />
  </AccordionRoot>
</template>
