<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { Textarea } from "@/components/ui/textarea";

const props = defineProps<{
  size?: "sm" | "default" | "lg" | number;
  class?: HTMLAttributes["class"];
}>();

const modelValue = defineModel<string>();
</script>

<template>
  <Textarea v-model="modelValue" :class="props.class" :size="size" unstyled />
</template>
