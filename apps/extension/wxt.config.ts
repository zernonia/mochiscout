import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    name: 'social-radar reader',
    description: 'Sends the Reddit posts you browse to your social-radar inbox. Read-only: it never posts, votes or messages.',
    permissions: ['storage'],
    host_permissions: ['https://www.reddit.com/*', 'https://old.reddit.com/*'],
    // The user's social-radar instance; requested when they save settings.
    optional_host_permissions: ['https://*/*', 'http://localhost/*'],
  },
})
