import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from "@lucide/vue";
import type { SwipeDirection, ToastObject, ToastPosition } from "./manager";

export const TOAST_ICONS = {
  error: CircleAlertIcon,
  info: InfoIcon,
  loading: LoaderCircleIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
} as const;

export type ToastIconComponent = (typeof TOAST_ICONS)[keyof typeof TOAST_ICONS];

export function toastIcon(toast: ToastObject): ToastIconComponent | null {
  if (!toast.type || !(toast.type in TOAST_ICONS)) return null;
  return TOAST_ICONS[toast.type as keyof typeof TOAST_ICONS];
}

export function getSwipeDirection(position: ToastPosition): SwipeDirection[] {
  const verticalDirection: SwipeDirection = position.startsWith("top")
    ? "up"
    : "down";

  if (position.includes("center")) {
    return [verticalDirection];
  }

  if (position.includes("left")) {
    return ["left", verticalDirection];
  }

  return ["right", verticalDirection];
}

export function upsertReplayClassName(toast: {
  type?: string;
  updateKey?: number;
}): string | undefined {
  const k = toast.updateKey ?? 0;
  if (k <= 0) return undefined;
  const isEven = k % 2 === 0;
  if (toast.type === "error") {
    return isEven ? "animate-toast-error-even" : "animate-toast-error-odd";
  }
  return isEven ? "animate-toast-success-even" : "animate-toast-success-odd";
}

export function scheduleStartingFlip(toasts: ToastObject[]): void {
  for (const toast of toasts) {
    if (toast.transitionStatus !== "starting") continue;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (toast.transitionStatus === "starting") toast.transitionStatus = "open";
      });
    });
  }
}
