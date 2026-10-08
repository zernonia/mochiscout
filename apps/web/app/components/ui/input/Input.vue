<script setup lang="ts">
import { computed, ref, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { useFieldControl } from "@/components/ui/field/context";

interface InputProps {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
  class?: HTMLAttributes["class"];
  modelValue?: string | number;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<InputProps>(), {
  size: "default",
  unstyled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const attrs = useAttrs();
const el = ref<HTMLInputElement | null>(null);
const control = useFieldControl(() => el.value, {
  id: () => attrs.id as string | undefined,
});

const inputClassName = computed(() =>
  cn(
    "h-8.5 w-full min-w-0 rounded-[inherit] px-[calc(--spacing(3)-1px)] text-foreground leading-8.5 outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-muted-foreground/72 sm:h-7.5 sm:leading-7.5 autofill:[-webkit-text-fill-color:var(--foreground)]",
    props.size === "sm" &&
      "h-7.5 px-[calc(--spacing(2.5)-1px)] leading-7.5 sm:h-6.5 sm:leading-6.5",
    props.size === "lg" && "h-9.5 leading-9.5 sm:h-8.5 sm:leading-8.5",
    attrs.type === "search" &&
      "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
    attrs.type === "file" &&
      "text-muted-foreground file:me-3 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
  ),
);

function onInput(event: Event): void {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
  control.onInput(event);
}

defineExpose({ el });
</script>

<template>
  <span
    :class="
      cn(
        !unstyled &&
          'relative inline-flex w-full rounded-lg border border-input bg-background not-dark:bg-clip-padding text-base shadow-xs/5 ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:has-aria-invalid:border-destructive/64 has-focus-visible:has-aria-invalid:ring-destructive/16 has-aria-invalid:border-destructive/36 has-focus-visible:border-ring has-autofill:bg-foreground/4 has-disabled:opacity-64 has-[:disabled,:focus-visible,[aria-invalid]]:shadow-none has-focus-visible:ring-[3px] sm:text-sm dark:bg-input/32 dark:has-autofill:bg-foreground/8 dark:has-aria-invalid:ring-destructive/24 dark:not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)]',
        props.class,
      ) || undefined
    "
    :data-size="size"
    data-slot="input-control"
  >
    <input
      ref="el"
      :class="inputClassName"
      data-slot="input"
      :size="typeof size === 'number' ? size : undefined"
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
