/** Message from an API error, for toasts. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  const e = error as { data?: { statusMessage?: string }, statusMessage?: string }
  return e.data?.statusMessage ?? e.statusMessage ?? fallback
}

/** 402s open the upgrade sheet instead of a toast. */
export function isPlanLimit(error: unknown) {
  return (error as { statusCode?: number }).statusCode === 402
}
