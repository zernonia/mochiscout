import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },

  modules: ['shadcn-nuxt'],
  css: ['~/assets/css/main.css'],

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  // Workspace packages ship TypeScript source; bundle them instead of loading from node_modules.
  build: {
    transpile: [/^@social-radar\//],
  },

  runtimeConfig: {
    public: {
      edition: 'selfhost' as 'selfhost' | 'cloud',
    },
  },

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: false,
      nodeCompat: true,
    },
    experimental: {
      tasks: true,
    },
    // One Cloudflare Cron Trigger (see wrangler.jsonc). The dispatcher decides
    // which jobs are due on each tick.
    scheduledTasks: {
      '*/15 * * * *': ['dispatch'],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
