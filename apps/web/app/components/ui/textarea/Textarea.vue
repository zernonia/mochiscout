<script setup lang="ts">
import { computed, ref, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/components/ui/field/context";

interface TextareaProps {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
  class?: HTMLAttributes["class"];
  modelValue?: string;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<TextareaProps>(), {
  size: "default",
  unstyled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const attrs = useAttrs();
const el = ref<HTMLTextAreaElement | null>(null);
const control = useFieldControl(() => el.value, {
  id: () => attrs.id as string | undefined,
});

const textareaClassName = computed(() =>
  cn(
    "field-sizing-content min-h-17.5 w-full rounded-[inherit] px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] text-foreground outline-none placeholder:text-muted-foreground/72 max-sm:min-h-20.5",
    props.size === "sm" &&
      "min-h-16.5 px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1)-1px)] max-sm:min-h-19.5",
    props.size === "lg" && "min-h-18.5 py-[calc(--spacing(2)-1px)] max-sm:min-h-21.5",
  ),
);

function onInput(event: Event): void {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
  control.onInput(event);
}

defineExpose({ el });
</script>

<template>
  <span
    :class="
      cn(
        !unstyled &&
          'relative inline-grid w-full rounded-lg border border-input bg-background not-dark:bg-clip-padding text-base shadow-xs/5 ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] has-focus-visible:has-aria-invalid:border-destructive/64 has-focus-visible:has-aria-invalid:ring-destructive/16 has-aria-invalid:border-destructive/36 has-focus-visible:border-ring has-disabled:opacity-64 has-[:disabled,:focus-visible,[aria-invalid]]:shadow-none has-focus-visible:ring-[3px] not-has-disabled:has-not-focus-visible:not-has-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] sm:text-sm dark:bg-input/32 dark:has-aria-invalid:ring-destructive/24 dark:not-has-disabled:has-not-focus-visible:not-has-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)]',
        props.class,
      ) || undefined
    "
    :data-size="size"
    data-slot="textarea-control"
  >
    <textarea
      ref="el"
      :class="textareaClassName"
      data-slot="textarea"
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
  </span>
</template>
