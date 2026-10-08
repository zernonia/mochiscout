import { defineConfig } from 'drizzle-kit'

// Migrations are generated here and applied with wrangler from apps/web:
//   pnpm db:generate && pnpm db:migrate:local
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/schema.ts',
  out: './migrations',
})
