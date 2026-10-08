<script setup lang="ts">
import { ref, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./context";

const props = defineProps<{
  class?: HTMLAttributes["class"];
  modelValue?: string | number;
}>();

defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const attrs = useAttrs();
const el = ref<HTMLInputElement | null>(null);
const control = useFieldControl(() => el.value, {
  id: () => attrs.id as string | undefined,
});

function onInput(event: Event): void {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
  control.onInput(event);
}
</script>

<template>
  <input
    ref="el"
    :class="cn(props.class)"
    data-slot="field-control"
    v-bind="{
      ...control.attrs.value,
      ...attrs,
      // only control the DOM value when v-model is used — binding
      // `undefined` would wipe user-typed text on unrelated re-renders
      ...(modelValue !== undefined ? { value: modelValue } : {}),
    }"
    @blur="control.onBlur"
    @focus="control.onFocus"
    @input="onInput"
  />
</template>
