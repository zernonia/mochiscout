import {
  computed,
  inject,
  onScopeDispose,
  provide,
  reactive,
  ref,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import { injectForm } from "@/components/ui/form/context";

export const VALIDITY_KEYS = [
  "badInput",
  "customError",
  "patternMismatch",
  "rangeOverflow",
  "rangeUnderflow",
  "stepMismatch",
  "tooLong",
  "tooShort",
  "typeMismatch",
  "valid",
  "valueMissing",
] as const;

export type ValidityKey = (typeof VALIDITY_KEYS)[number];

export interface FieldValidityData {
  state: Record<ValidityKey, boolean>;
  error: string;
  errors: string[];
  value: unknown;
}

export type FieldControlElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export interface FieldContext {
  controlId: Ref<string | undefined>;
  labelId: Ref<string | undefined>;
  descriptionId: Ref<string | undefined>;
  /** Ids of all visible FieldErrors — each contributes to aria-describedby. */
  errorIds: Ref<string[]>;
  name: ComputedRef<string | undefined>;
  disabled: ComputedRef<boolean>;
  /** null until the first validation has run */
  valid: Ref<boolean | null>;
  validityData: Ref<FieldValidityData>;
  externalErrors: ComputedRef<string[]>;
  invalid: ComputedRef<boolean>;
  state: { touched: boolean; dirty: boolean; filled: boolean; focused: boolean };
  describedBy: ComputedRef<string | undefined>;
  dataAttrs: ComputedRef<Record<string, "" | undefined>>;
  registerControl: (getEl: () => FieldControlElement | null) => void;
  validate: () => boolean;
  onControlFocus: () => void;
  onControlBlur: () => void;
  onControlInput: (value: unknown) => void;
}

export const FIELD_INJECTION_KEY: InjectionKey<FieldContext> =
  Symbol("coss-field");

export function injectField(): FieldContext | null {
  return inject(FIELD_INJECTION_KEY, null);
}

function initialValidity(): FieldValidityData {
  const state = Object.fromEntries(
    VALIDITY_KEYS.map((key) => [key, key === "valid"]),
  ) as Record<ValidityKey, boolean>;
  return { error: "", errors: [], state, value: undefined };
}

export function createFieldContext(options: {
  id: string;
  name: () => string | undefined;
  disabled: () => boolean;
  forceInvalid: () => boolean | undefined;
  customValidate: () => ((value: unknown) => string | string[] | null) | undefined;
}): FieldContext {
  const form = injectForm();

  const controlId = ref<string | undefined>(`${options.id}-control`);
  const labelId = ref<string | undefined>(`${options.id}-label`);
  const descriptionId = ref<string | undefined>(undefined);
  const errorIds = ref<string[]>([]);

  const name = computed(options.name);
  const disabled = computed(options.disabled);
  const valid = ref<boolean | null>(null);
  const validityData = ref<FieldValidityData>(initialValidity());
  const state = reactive({
    dirty: false,
    filled: false,
    focused: false,
    touched: false,
  });

  let getControl: (() => FieldControlElement | null) | null = null;

  const externalErrors = computed<string[]>(() => {
    const fieldName = name.value;
    if (!form || !fieldName) return [];
    return form.errorsFor(fieldName);
  });

  const invalid = computed(
    () =>
      options.forceInvalid() === true ||
      valid.value === false ||
      externalErrors.value.length > 0,
  );

  function readValidity(): boolean {
    const el = getControl?.();
    const data = initialValidity();
    let isValid = true;

    if (el) {
      data.value = el.value;
      for (const key of VALIDITY_KEYS) data.state[key] = el.validity[key];
      if (!el.validity.valid) {
        isValid = false;
        data.errors.push(el.validationMessage);
      }
    }

    const customValidate = options.customValidate();
    if (isValid && customValidate) {
      const result = customValidate(el?.value);
      if (result != null && result !== "" && (!Array.isArray(result) || result.length)) {
        isValid = false;
        data.state.customError = true;
        data.state.valid = false;
        data.errors.push(...(Array.isArray(result) ? result : [result]));
      }
    }

    data.error = data.errors[0] ?? "";
    validityData.value = data;
    valid.value = isValid;
    return isValid;
  }

  const context: FieldContext = {
    controlId,
    dataAttrs: computed(() => ({
      "data-dirty": state.dirty ? "" : undefined,
      "data-disabled": disabled.value ? "" : undefined,
      "data-filled": state.filled ? "" : undefined,
      "data-focused": state.focused ? "" : undefined,
      "data-invalid": invalid.value ? "" : undefined,
      "data-touched": state.touched ? "" : undefined,
      "data-valid": valid.value === true && !invalid.value ? "" : undefined,
    })),
    describedBy: computed(() => {
      const ids = [descriptionId.value, ...errorIds.value].filter(Boolean);
      return ids.length ? ids.join(" ") : undefined;
    }),
    descriptionId,
    disabled,
    errorIds,
    externalErrors,
    invalid,
    labelId,
    name,
    onControlBlur() {
      state.focused = false;
      state.touched = true;
      readValidity();
    },
    onControlFocus() {
      state.focused = true;
    },
    onControlInput(value) {
      state.dirty = true;
      state.filled = value != null && value !== "";
      if (valid.value === false) readValidity();
      if (form && name.value) form.clearError(name.value);
    },
    registerControl(getEl) {
      getControl = getEl;
    },
    state,
    valid,
    validate: readValidity,
    validityData,
  };

  provide(FIELD_INJECTION_KEY, context);

  if (form) {
    const unregister = form.registerField({
      focus: () => getControl?.()?.focus(),
      name: () => name.value,
      validate: () => (disabled.value ? true : readValidity()),
    });
    onScopeDispose(unregister);
  }

  return context;
}

/**
 * Wires a form control (input/textarea/select) into the surrounding Field.
 * Returns reactive attrs to v-bind plus event handlers to attach.
 */
export function useFieldControl(
  getEl: () => FieldControlElement | null,
  options?: { id?: () => string | number | undefined },
): {
  attrs: ComputedRef<Record<string, unknown>>;
  onBlur: () => void;
  onFocus: () => void;
  onInput: (event: Event) => void;
} {
  const field = injectField();
  field?.registerControl(getEl);

  if (field && options?.id) {
    const fallbackId = field.controlId.value;
    watchEffect(() => {
      const userId = options.id?.();
      field.controlId.value = userId != null ? String(userId) : fallbackId;
    });
  }

  return {
    attrs: computed(() => {
      if (!field) return {};
      return {
        "aria-describedby": field.describedBy.value,
        "aria-invalid": field.invalid.value ? "true" : undefined,
        disabled: field.disabled.value || undefined,
        id: field.controlId.value,
        name: field.name.value,
      };
    }),
    onBlur: () => field?.onControlBlur(),
    onFocus: () => field?.onControlFocus(),
    onInput: (event: Event) =>
      field?.onControlInput((event.target as FieldControlElement)?.value),
  };
}
