<script setup lang="ts">
import type { TagsInputRootEmits, TagsInputRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputRoot, useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<TagsInputRootProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<TagsInputRootEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TagsInputRoot
    v-slot="slotProps" v-bind="forwarded" :class="cn(
      'flex min-h-8.5 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-background not-dark:bg-clip-padding px-1.5 py-1 text-base shadow-xs/5 ring-ring/24 transition-shadow focus-within:border-ring focus-within:ring-[3px] sm:min-h-7.5 sm:text-sm dark:bg-input/32',
      props.class)"
  >
    <slot v-bind="slotProps" />
  </TagsInputRoot>
</template>
