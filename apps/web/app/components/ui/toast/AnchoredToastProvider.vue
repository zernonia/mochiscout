<script setup lang="ts">
import { onScopeDispose, provide, watchEffect } from "vue";
import AnchoredToasts from "./AnchoredToasts.vue";
import {
  TOAST_MANAGER_INJECTION_KEY,
  anchoredToastManager as defaultAnchoredToastManager,
  type AnchoredToastProviderProps,
} from "./manager";

const props = defineProps<AnchoredToastProviderProps>();

const manager = props.toastManager ?? defaultAnchoredToastManager;

provide(TOAST_MANAGER_INJECTION_KEY, manager);

watchEffect(() => manager.setDefaultTimeout(props.timeout));
onScopeDispose(() => manager.setDefaultTimeout(undefined));
</script>

<template>
  <slot />
  <AnchoredToasts :manager="manager" :portal-props="portalProps" />
</template>
