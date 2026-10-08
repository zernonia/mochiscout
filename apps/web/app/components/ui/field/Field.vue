<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import { useId, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { createFieldContext } from "./context";

interface FieldProps extends PrimitiveProps {
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  validate?: (value: unknown) => string | string[] | null;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<FieldProps>(), {
  as: "div",
  disabled: false,
});

const context = createFieldContext({
  customValidate: () => props.validate,
  disabled: () => props.disabled,
  forceInvalid: () => props.invalid,
  id: useId(),
  name: () => props.name,
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn('flex flex-col items-start gap-2', props.class)"
    data-slot="field"
    v-bind="context.dataAttrs.value"
  >
    <slot />
  </Primitive>
</template>
