<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  useId,
  useSlots,
  watchEffect,
  type HTMLAttributes,
} from "vue";
import { cn } from "@/lib/utils";
import { injectField, type ValidityKey } from "./context";

interface FieldErrorProps {
  /**
   * Show only when the given ValidityState flag is raised
   * (e.g. "valueMissing", "typeMismatch"). `true` always shows.
   */
  match?: ValidityKey | boolean;
  class?: HTMLAttributes["class"];
}

const props = defineProps<FieldErrorProps>();

const field = injectField();
const slots = useSlots();
const id = `${useId()}-error`;

const visible = computed(() => {
  if (!field) return false;
  if (field.disabled.value) return false;
  if (props.match === true) return true;
  if (typeof props.match === "string")
    return field.validityData.value.state[props.match] === true;
  if (field.externalErrors.value.length > 0) return true;
  return field.valid.value === false;
});

const messages = computed(() => {
  if (!field) return [];
  if (field.externalErrors.value.length > 0) return field.externalErrors.value;
  return field.validityData.value.errors;
});

watchEffect(() => {
  if (!field) return;
  const registered = field.errorIds.value.includes(id);
  if (visible.value && !registered)
    field.errorIds.value = [...field.errorIds.value, id];
  else if (!visible.value && registered)
    field.errorIds.value = field.errorIds.value.filter((x) => x !== id);
});
onBeforeUnmount(() => {
  if (field)
    field.errorIds.value = field.errorIds.value.filter((x) => x !== id);
});
</script>

<template>
  <div
    v-if="visible"
    :class="cn('text-destructive-foreground text-xs', props.class)"
    data-slot="field-error"
    :id="id"
    role="alert"
  >
    <slot v-if="slots.default" />
    <template v-else-if="messages.length === 1">{{ messages[0] }}</template>
    <ul v-else-if="messages.length > 1">
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
  </div>
</template>
