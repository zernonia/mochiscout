import { defineConfig } from 'vitest/config'

// Offline evals call the real model: run only on purpose (pnpm eval:scoring), never in `pnpm test`.
export default defineConfig({
  test: {
    include: ['eval/**/*.eval.ts'],
    testTimeout: 15 * 60_000,
  },
})
