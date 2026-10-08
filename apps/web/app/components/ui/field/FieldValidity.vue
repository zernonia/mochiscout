<script setup lang="ts">
import { computed } from "vue";
import { injectField, type FieldValidityData } from "./context";

const field = injectField();

const validity = computed<FieldValidityData>(
  () =>
    field?.validityData.value ?? {
      error: "",
      errors: [],
      state: {} as FieldValidityData["state"],
      value: undefined,
    },
);
</script>

<template>
  <slot v-bind="validity" />
</template>
