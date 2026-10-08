import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastPortal,
  ToastProvider as RekaToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "reka-ui";

export { default as AnchoredToastProvider } from "./AnchoredToastProvider.vue";
export { default as ToastProvider } from "./ToastProvider.vue";

export {
  anchoredToastManager,
  createToastManager,
  toastManager,
  useToastManager,
} from "./manager";

export type {
  AnchoredToastProviderProps,
  ToastActionProps,
  ToastAddOptions,
  ToastData,
  ToastManager,
  ToastObject,
  ToastPosition,
  ToastPositionerProps,
  ToastPromiseOptions,
  ToastProviderProps,
  ToastType,
  ToastUpdateOptions,
} from "./manager";

export const ToastPrimitive = {
  Action: ToastAction,
  Close: ToastClose,
  Description: ToastDescription,
  Portal: ToastPortal,
  Provider: RekaToastProvider,
  Root: ToastRoot,
  Title: ToastTitle,
  Viewport: ToastViewport,
} as const;
