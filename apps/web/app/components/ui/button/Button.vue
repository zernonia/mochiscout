<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import { computed, type ButtonHTMLAttributes, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { buttonVariants, type ButtonVariants } from ".";

interface ButtonProps extends PrimitiveProps {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  loading?: boolean;
  disabled?: boolean;
  type?: ButtonHTMLAttributes["type"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<ButtonProps>(), {
  as: "button",
  loading: false,
});

const isDisabled = computed(() => Boolean(props.loading || props.disabled));
const typeValue = computed(() =>
  props.asChild || props.as !== "button" ? undefined : (props.type ?? "button"),
);
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ class: props.class, size, variant }))"
    :aria-disabled="loading || undefined"
    :data-loading="loading ? '' : undefined"
    data-slot="button"
    :disabled="isDisabled || undefined"
    :type="typeValue"
  >
    <slot />
    <Spinner
      v-if="loading"
      class="pointer-events-none absolute"
      data-slot="button-loading-indicator"
    />
  </Primitive>
</template>
