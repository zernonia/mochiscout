<script setup lang="ts">
import {
  SwitchRoot,
  SwitchThumb,
  useForwardPropsEmits,
  type SwitchRootEmits,
  type SwitchRootProps,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectField } from "@/components/ui/field/context";

interface SwitchProps extends SwitchRootProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<SwitchProps>();
const emits = defineEmits<SwitchRootEmits>();

const field = injectField();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    :aria-invalid="field?.invalid.value ? 'true' : undefined"
    :class="
      cn(
        'inline-flex h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)] shrink-0 items-center rounded-full p-px outline-none transition-[background-color,box-shadow] duration-200 [--thumb-size:--spacing(5)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-disabled:cursor-not-allowed data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-disabled:opacity-64 sm:[--thumb-size:--spacing(4)]',
        props.class,
      )
    "
    data-slot="switch"
  >
    <SwitchThumb
      :class="
        cn(
          'pointer-events-none block aspect-square h-full origin-left in-[[role=switch]:active,[data-slot=label]:active,[data-slot=field-label]:active]:not-data-disabled:scale-x-110 in-[[role=switch]:active,[data-slot=label]:active,[data-slot=field-label]:active]:rounded-[var(--thumb-size)/calc(var(--thumb-size)*1.1)] rounded-(--thumb-size) bg-background shadow-sm/5 will-change-transform [transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s] data-[state=checked]:origin-[var(--thumb-size)_50%] data-[state=checked]:translate-x-[calc(var(--thumb-size)-4px)]',
        )
      "
      data-slot="switch-thumb"
    />
  </SwitchRoot>
</template>
