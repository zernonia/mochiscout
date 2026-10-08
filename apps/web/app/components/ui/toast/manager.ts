import { getCurrentInstance, inject, markRaw, reactive, type InjectionKey } from "vue";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type SwipeDirection = "up" | "down" | "left" | "right";

export type ToastType = "error" | "info" | "loading" | "success" | "warning";

export interface ToastActionProps {
  children?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface ToastPositionerProps {
  /** Element an anchored toast is positioned against. */
  anchor?: HTMLElement | null;
  side?: "top" | "bottom";
  sideOffset?: number;
}

export interface ToastData {
  /** Extra attributes spread onto the toast root element. */
  rootProps?: Record<string, unknown>;
  tooltipStyle?: boolean;
}

export interface ToastAddOptions {
  /** Pass a stable id to upsert: re-adding an existing id updates it in place. */
  id?: string;
  title?: string;
  description?: string;
  type?: ToastType | (string & {});
  /** Auto-dismiss delay in ms. `0` disables the timer. Defaults to the provider/manager timeout (5000). */
  timeout?: number;
  priority?: "low" | "high";
  actionProps?: ToastActionProps;
  positionerProps?: ToastPositionerProps;
  data?: ToastData;
  onClose?: () => void;
  onRemove?: () => void;
}

export type ToastUpdateOptions = Omit<ToastAddOptions, "id">;

export interface ToastObject extends ToastAddOptions {
  id: string;
  /** Increments each time `add()` re-uses an existing id (drives the replay animations). */
  updateKey: number;
  /** "starting" → "open" → "ending"; drives data-starting-style / data-ending-style. */
  transitionStatus: "starting" | "open" | "ending";
  /** Measured natural height (px), used for the stack offset calculations. */
  height: number;
  /** Direction the toast was dismissed by swiping; unset for other dismissals. */
  swipeDirection?: SwipeDirection;
  /** Live swipe displacement (px), mirrored into --toast-swipe-movement-x/y. */
  swipeX: number;
  swipeY: number;
}

export type ToastPromiseStateInput = string | ToastUpdateOptions;

export interface ToastPromiseOptions<Value> {
  loading: ToastPromiseStateInput | (() => ToastPromiseStateInput);
  success: ToastPromiseStateInput | ((data: Value) => ToastPromiseStateInput);
  error: ToastPromiseStateInput | ((error: Error) => ToastPromiseStateInput);
}

export interface ToastManager {
  /** Reactive list of toasts, newest first (index 0 is the frontmost toast). */
  toasts: ToastObject[];
  add: (options?: ToastAddOptions) => string;
  update: (id: string, options: ToastUpdateOptions) => void;
  close: (id: string) => void;
  promise: <Value>(
    promiseValue: Promise<Value>,
    options: ToastPromiseOptions<Value>,
  ) => Promise<Value>;
  /** Removes a toast immediately, skipping the exit transition. */
  remove: (id: string) => void;
  /** Ref-counted timer pause — used by the renderers on hover/focus/swipe. */
  pauseTimers: () => void;
  resumeTimers: () => void;
  /** Set by <ToastProvider timeout> while mounted; `undefined` restores 5000. */
  setDefaultTimeout: (timeout: number | undefined) => void;
}

export interface ToastProviderProps {
  position?: ToastPosition;
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  /** Default auto-dismiss timeout (ms) for toasts without an explicit `timeout`. */
  timeout?: number;
  /** Maximum number of visible stacked toasts; the rest get `data-limited` and are hidden. */
  limit?: number;
  toastManager?: ToastManager;
}

export interface AnchoredToastProviderProps {
  portalProps?: { to?: string | HTMLElement; disabled?: boolean };
  timeout?: number;
  toastManager?: ToastManager;
}

const DEFAULT_TIMEOUT = 5000;

let uid = 0;

interface ToastTimer {
  remaining: number;
  started: number;
  handle: ReturnType<typeof setTimeout> | undefined;
}

function normalizeOptions<Options extends ToastUpdateOptions>(options: Options): Options {
  if (options.positionerProps) {
    // DOM elements must not be wrapped in Vue's reactive proxies.
    return { ...options, positionerProps: markRaw({ ...options.positionerProps }) };
  }
  return options;
}

function resolvePromiseState<Arg>(
  state: ToastPromiseStateInput | ((arg: Arg) => ToastPromiseStateInput),
  arg: Arg,
): ToastUpdateOptions {
  const value = typeof state === "function" ? state(arg) : state;
  return typeof value === "string" ? { title: value } : value;
}

export function createToastManager(options?: {
  /** Delay (ms) between `data-ending-style` and removal; covers the exit transition. */
  removeDelay?: number;
}): ToastManager {
  const removeDelay = options?.removeDelay ?? 600;
  const toasts = reactive<ToastObject[]>([]);
  const timers = new Map<string, ToastTimer>();
  const removeHandles = new Map<string, ReturnType<typeof setTimeout>>();
  let pauseCount = 0;
  let defaultTimeout = DEFAULT_TIMEOUT;

  function find(id: string): ToastObject | undefined {
    return toasts.find((toast) => toast.id === id);
  }

  function clearTimer(id: string): void {
    const timer = timers.get(id);
    if (timer?.handle !== undefined) clearTimeout(timer.handle);
    timers.delete(id);
  }

  function startTimer(id: string, timer: ToastTimer): void {
    timer.started = Date.now();
    timer.handle = setTimeout(() => {
      timers.delete(id);
      close(id);
    }, Math.max(timer.remaining, 0));
  }

  function scheduleTimeout(id: string, timeout: number | undefined): void {
    clearTimer(id);
    const total = timeout ?? defaultTimeout;
    if (total <= 0 || !Number.isFinite(total)) return;
    const timer: ToastTimer = { handle: undefined, remaining: total, started: 0 };
    timers.set(id, timer);
    if (pauseCount === 0) startTimer(id, timer);
  }

  function add(addOptions: ToastAddOptions = {}): string {
    const id = addOptions.id ?? `coss-toast-${++uid}`;
    const existing = find(id);
    if (existing) {
      const merged = normalizeOptions({ ...addOptions });
      delete merged.id;
      Object.assign(existing, merged);
      existing.updateKey += 1;
      if (existing.transitionStatus === "ending") {
        const pending = removeHandles.get(id);
        if (pending !== undefined) clearTimeout(pending);
        removeHandles.delete(id);
        existing.transitionStatus = "open";
        existing.swipeDirection = undefined;
        existing.swipeX = 0;
        existing.swipeY = 0;
      }
      scheduleTimeout(id, existing.timeout);
      return id;
    }

    const toast: ToastObject = {
      height: 0,
      swipeX: 0,
      swipeY: 0,
      transitionStatus: "starting",
      updateKey: 0,
      ...normalizeOptions(addOptions),
      id,
    };
    toasts.unshift(toast);
    scheduleTimeout(id, toast.timeout);
    return id;
  }

  function update(id: string, updateOptions: ToastUpdateOptions): void {
    const toast = find(id);
    if (!toast) return;
    Object.assign(toast, normalizeOptions(updateOptions));
    if (updateOptions.timeout !== undefined) scheduleTimeout(id, updateOptions.timeout);
  }

  function close(id: string): void {
    const toast = find(id);
    if (!toast || toast.transitionStatus === "ending") return;
    clearTimer(id);
    toast.transitionStatus = "ending";
    toast.onClose?.();
    removeHandles.set(
      id,
      setTimeout(() => remove(id), removeDelay),
    );
  }

  function remove(id: string): void {
    clearTimer(id);
    const pending = removeHandles.get(id);
    if (pending !== undefined) clearTimeout(pending);
    removeHandles.delete(id);
    const index = toasts.findIndex((toast) => toast.id === id);
    if (index === -1) return;
    const [toast] = toasts.splice(index, 1);
    toast?.onRemove?.();
  }

  function promise<Value>(
    promiseValue: Promise<Value>,
    promiseOptions: ToastPromiseOptions<Value>,
  ): Promise<Value> {
    const loading = resolvePromiseState<void>(promiseOptions.loading, undefined);
    const id = add({ type: "loading", ...loading, timeout: loading.timeout ?? 0 });

    function settle(state: ToastUpdateOptions, fallbackType: ToastType): void {
      update(id, {
        type: fallbackType,
        ...state,
        timeout: state.timeout ?? defaultTimeout,
      });
    }

    return promiseValue.then(
      (data) => {
        settle(resolvePromiseState(promiseOptions.success, data), "success");
        return data;
      },
      (error: unknown) => {
        settle(resolvePromiseState(promiseOptions.error, error as Error), "error");
        throw error;
      },
    );
  }

  function pauseTimers(): void {
    pauseCount += 1;
    if (pauseCount !== 1) return;
    for (const timer of timers.values()) {
      if (timer.handle === undefined) continue;
      clearTimeout(timer.handle);
      timer.handle = undefined;
      timer.remaining -= Date.now() - timer.started;
    }
  }

  function resumeTimers(): void {
    if (pauseCount === 0) return;
    pauseCount -= 1;
    if (pauseCount !== 0) return;
    for (const [id, timer] of timers.entries()) {
      if (timer.handle === undefined) startTimer(id, timer);
    }
  }

  return {
    add,
    close,
    pauseTimers,
    promise,
    remove,
    resumeTimers,
    setDefaultTimeout: (timeout) => {
      defaultTimeout = timeout ?? DEFAULT_TIMEOUT;
    },
    toasts,
    update,
  };
}

export const toastManager: ToastManager = createToastManager();

export const anchoredToastManager: ToastManager = createToastManager({ removeDelay: 300 });

export const TOAST_MANAGER_INJECTION_KEY: InjectionKey<ToastManager> =
  Symbol("coss-toast-manager");

export function useToastManager(manager?: ToastManager): ToastManager {
  const injected = getCurrentInstance()
    ? inject(TOAST_MANAGER_INJECTION_KEY, null)
    : null;
  return manager ?? injected ?? toastManager;
}
