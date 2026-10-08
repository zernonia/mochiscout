<script setup lang="ts">
import { computed, onScopeDispose, ref, watch, watchEffect } from "vue";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { scheduleStartingFlip, toastIcon, upsertReplayClassName } from "./internal";
import type { ToastManager, ToastObject } from "./manager";

interface AnchoredToastsProps {
  manager: ToastManager;
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
}

const props = defineProps<AnchoredToastsProps>();

const anchoredToasts = computed(() =>
  props.manager.toasts.filter((toast) => toast.positionerProps?.anchor),
);

watchEffect(() => scheduleStartingFlip(anchoredToasts.value), { flush: "post" });

const repositionTick = ref(0);
function reposition(): void {
  repositionTick.value += 1;
}

const hasToasts = computed(() => anchoredToasts.value.length > 0);
// immediate: the manager is a module-level singleton, so anchored toasts can
// already exist when this provider mounts (HMR remount, late mount).
watch(
  hasToasts,
  (active) => {
    if (typeof window === "undefined") return;
    if (active) {
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);
    } else {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    }
  },
  { immediate: true },
);
onScopeDispose(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("scroll", reposition, true);
  window.removeEventListener("resize", reposition);
});

function positionerStyle(toast: ToastObject): Record<string, string> {
  void repositionTick.value;
  const positionerProps = toast.positionerProps;
  const anchor = positionerProps?.anchor;
  if (!anchor) return {};
  const rect = anchor.getBoundingClientRect();
  const side = positionerProps?.side ?? "top";
  const sideOffset = positionerProps?.sideOffset ?? 4;
  return {
    left: `${rect.left + rect.width / 2}px`,
    position: "fixed",
    top:
      side === "top" ? `${rect.top - sideOffset}px` : `${rect.bottom + sideOffset}px`,
    transform: side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
  };
}

function onActionClick(toast: ToastObject, event: MouseEvent): void {
  toast.actionProps?.onClick?.(event);
}

function onFocusOut(event: FocusEvent): void {
  const current = event.currentTarget as HTMLElement | null;
  if (current?.contains(event.relatedTarget as Node | null)) return;
  props.manager.resumeTimers();
}
</script>

<template>
  <Teleport :disabled="portalProps?.disabled" :to="portalProps?.to ?? 'body'">
    <div
      aria-label="Notifications"
      class="outline-none"
      data-slot="toast-viewport-anchored"
      role="region"
    >
      <div
        v-for="toast in anchoredToasts"
        :key="toast.id"
        class="z-60 max-w-[min(--spacing(64),100vw)]"
        data-slot="toast-positioner"
        :style="positionerStyle(toast)"
        @focusin="manager.pauseTimers()"
        @focusout="onFocusOut"
        @pointerenter="manager.pauseTimers()"
        @pointerleave="manager.resumeTimers()"
      >
        <div
          v-bind="toast.data?.rootProps"
          aria-atomic="true"
          :class="
            cn(
              'relative text-balance border bg-popover not-dark:bg-clip-padding text-popover-foreground text-xs transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
              toast.data?.tooltipStyle
                ? 'rounded-md shadow-md/5 before:rounded-[calc(var(--radius-md)-1px)]'
                : 'rounded-lg shadow-lg/5 before:rounded-[calc(var(--radius-lg)-1px)]',
              upsertReplayClassName(toast),
            )
          "
          :data-ending-style="toast.transitionStatus === 'ending' ? '' : undefined"
          :data-starting-style="toast.transitionStatus === 'starting' ? '' : undefined"
          :data-type="toast.type"
          data-slot="toast-popup"
          role="status"
        >
          <div v-if="toast.data?.tooltipStyle" class="pointer-events-auto px-2 py-1">
            <div data-slot="toast-title">{{ toast.title }}</div>
          </div>
          <div
            v-else
            class="pointer-events-auto flex items-center justify-between gap-1.5 overflow-hidden px-3.5 py-3 text-sm"
          >
            <div class="flex gap-2">
              <div
                v-if="toastIcon(toast)"
                class="[&>svg]:h-lh [&>svg]:w-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                data-slot="toast-icon"
              >
                <component
                  :is="toastIcon(toast)"
                  class="in-data-[type=loading]:animate-spin in-data-[type=error]:text-destructive in-data-[type=info]:text-info in-data-[type=success]:text-success in-data-[type=warning]:text-warning in-data-[type=loading]:opacity-80"
                />
              </div>

              <div class="flex flex-col gap-0.5">
                <div v-if="toast.title" class="font-medium" data-slot="toast-title">
                  {{ toast.title }}
                </div>
                <div
                  v-if="toast.description"
                  class="text-muted-foreground"
                  data-slot="toast-description"
                >
                  {{ toast.description }}
                </div>
              </div>
            </div>
            <button
              v-if="toast.actionProps"
              :class="buttonVariants({ size: 'xs' })"
              data-slot="toast-action"
              type="button"
              @click="onActionClick(toast, $event)"
            >
              {{ toast.actionProps.children }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
