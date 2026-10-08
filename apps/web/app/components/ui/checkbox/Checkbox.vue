<script setup lang="ts">
import {
  CheckboxIndicator,
  CheckboxRoot,
  useForwardPropsEmits,
  type CheckboxRootEmits,
  type CheckboxRootProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectField } from "@/components/ui/field/context";

interface CheckboxProps extends CheckboxRootProps {
  defaultChecked?: boolean | "indeterminate";
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  // Absent boolean props must stay `undefined` (not Vue's `false` cast) so
  // the `defaultValue ?? defaultChecked` fallback below can resolve.
  defaultChecked: undefined,
  defaultValue: undefined,
});
const emits = defineEmits<CheckboxRootEmits>();

const field = injectField();

// `defaultValue` is bound explicitly in the template — keys synthesized here
// would be dropped by `useForwardProps` (it only forwards parent-assigned props).
const delegatedProps = computed(() => {
  const { class: _, defaultChecked, defaultValue, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <CheckboxRoot
    v-slot="{ state }"
    v-bind="forwarded"
    :aria-invalid="field?.invalid.value ? 'true' : undefined"
    :default-value="defaultValue ?? defaultChecked"
    :class="
      cn(
        'relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-[.25rem] border border-input bg-background not-dark:bg-clip-padding shadow-xs/5 outline-none ring-ring transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[3px] not-data-disabled:not-data-[state=checked]:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/48 data-disabled:cursor-not-allowed data-disabled:opacity-64 sm:size-4 dark:not-data-[state=checked]:bg-input/32 dark:aria-invalid:ring-destructive/24 dark:not-data-disabled:not-data-[state=checked]:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] [[data-disabled],[data-state=checked],[aria-invalid]]:shadow-none',
        props.class,
      )
    "
    data-slot="checkbox"
  >
    <CheckboxIndicator
      class="absolute -inset-px flex items-center justify-center rounded-[.25rem] text-primary-foreground data-[state=unchecked]:hidden data-[state=checked]:bg-primary data-[state=indeterminate]:text-foreground"
      data-slot="checkbox-indicator"
    >
      <svg
        v-if="state === 'indeterminate'"
        aria-hidden="true"
        class="size-3.5 sm:size-3"
        fill="none"
        height="24"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="3"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.252 12h13.496" />
      </svg>
      <svg
        v-else
        aria-hidden="true"
        class="size-3.5 sm:size-3"
        fill="none"
        height="24"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="3"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
      </svg>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
