<script setup lang="ts">
import { onScopeDispose, provide, watchEffect } from "vue";
import Toasts from "./Toasts.vue";
import {
  TOAST_MANAGER_INJECTION_KEY,
  toastManager as defaultToastManager,
  type ToastProviderProps,
} from "./manager";

const props = withDefaults(defineProps<ToastProviderProps>(), {
  limit: 3,
  position: "bottom-right",
});

const manager = props.toastManager ?? defaultToastManager;

provide(TOAST_MANAGER_INJECTION_KEY, manager);

watchEffect(() => manager.setDefaultTimeout(props.timeout));
onScopeDispose(() => manager.setDefaultTimeout(undefined));
</script>

<template>
  <slot />
  <Toasts
    :limit="limit"
    :manager="manager"
    :portal-props="portalProps"
    :position="position"
  />
</template>
