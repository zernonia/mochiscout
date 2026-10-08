<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { Input } from "@/components/ui/input";

const props = defineProps<{
  size?: "sm" | "default" | "lg" | number;
  class?: HTMLAttributes["class"];
}>();

const modelValue = defineModel<string | number>();
</script>

<template>
  <Input v-model="modelValue" :class="props.class" :size="size" unstyled />
</template>
