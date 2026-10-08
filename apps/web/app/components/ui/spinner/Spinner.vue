<script setup lang="ts">
import { Loader2Icon } from "@lucide/vue";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <Loader2Icon
    aria-label="Loading"
    :class="cn('animate-spin', props.class)"
    role="status"
  />
</template>
