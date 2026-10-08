<script setup lang="ts">
import {
  computed,
  provide,
  reactive,
  useAttrs,
  watch,
  type HTMLAttributes,
} from "vue";
import {
  FORM_INJECTION_KEY,
  type RegisteredField,
} from "./context";

interface FormProps {
  /** External (e.g. server) errors keyed by field name. */
  errors?: Record<string, string | string[]>;
  class?: HTMLAttributes["class"];
}

defineOptions({ inheritAttrs: false });

const props = defineProps<FormProps>();

const emit = defineEmits<{
  clearErrors: [errors: Record<string, string | string[]>];
}>();

const attrs = useAttrs();

const fields = new Set<RegisteredField>();
const clearedNames = reactive(new Set<string>());

watch(
  () => props.errors,
  () => clearedNames.clear(),
);

provide(FORM_INJECTION_KEY, {
  clearError(name) {
    if (!props.errors || !(name in props.errors) || clearedNames.has(name))
      return;
    clearedNames.add(name);
    const next = { ...props.errors };
    delete next[name];
    emit("clearErrors", next);
  },
  errorsFor(name) {
    if (!props.errors || clearedNames.has(name)) return [];
    const value = props.errors[name];
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  },
  registerField(field) {
    fields.add(field);
    return () => fields.delete(field);
  },
});

const restAttrs = computed(() => {
  const { onSubmit: _onSubmit, ...rest } = attrs;
  return rest;
});

function handleSubmit(event: Event): void {
  clearedNames.clear();

  let firstInvalid: RegisteredField | null = null;
  for (const field of fields) {
    const valid = field.validate();
    if (!valid && !firstInvalid) firstInvalid = field;
  }
  if (firstInvalid) {
    event.preventDefault();
    firstInvalid.focus();
    return;
  }
  const onSubmit = attrs.onSubmit as ((e: Event) => void) | undefined;
  onSubmit?.(event);
}
</script>

<template>
  <form
    :class="props.class"
    data-slot="form"
    novalidate
    v-bind="restAttrs"
    @submit="handleSubmit"
  >
    <slot />
  </form>
</template>
