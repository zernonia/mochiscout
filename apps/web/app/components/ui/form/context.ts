import { inject, type InjectionKey } from "vue";

export interface RegisteredField {
  name: () => string | undefined;
  validate: () => boolean;
  focus: () => void;
}

export interface FormContext {
  /** Returns an unregister function. */
  registerField: (field: RegisteredField) => () => void;
  errorsFor: (name: string) => string[];
  clearError: (name: string) => void;
}

export const FORM_INJECTION_KEY: InjectionKey<FormContext> = Symbol("coss-form");

export function injectForm(): FormContext | null {
  return inject(FORM_INJECTION_KEY, null);
}
