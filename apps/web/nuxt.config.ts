import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',

  experimental: {
    // Keep fetched data between pages so revisits render from cache (see composables/useCachedFetch).
    purgeCachedData: false,
  },
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [{ name: 'theme-color', content: '#fafafa' }],
    },
  },

  modules: ['shadcn-nuxt', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  // Workspace packages ship TypeScript source; bundle them instead of loading from node_modules.
  build: {
    transpile: [/^@mochiscout\//],
  },

  runtimeConfig: {
    // Sealed cookie sessions (nuxt-auth-utils): NUXT_SESSION_PASSWORD, 32+ characters.
    session: {
      maxAge: 60 * 60 * 24 * 30,
    },
    // NUXT_OAUTH_GITHUB_CLIENT_ID / _SECRET and NUXT_OAUTH_GOOGLE_CLIENT_ID / _SECRET.
    oauth: {
      github: { clientId: '', clientSecret: '' },
      google: { clientId: '', clientSecret: '' },
    },
    public: {
      edition: 'selfhost' as 'selfhost' | 'cloud',
      /** Hosted edition before launch: landing collects emails and open sign-ups are closed. */
      waitlist: false,
      /** GitHub repo that receives subreddit rule suggestions (owner/name). */
      rulesRepo: 'zernonia/social-radar',
      /** PostHog project key (NUXT_PUBLIC_POSTHOG_KEY). Empty = no analytics; only used on the cloud edition. */
      posthogKey: '',
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
