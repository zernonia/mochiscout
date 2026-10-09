import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    name: 'Mochiscout reader',
    description: 'Sends the Reddit posts you browse to your Mochiscout inbox. Read-only: it never posts, votes or messages.',
    permissions: ['storage'],
    host_permissions: ['https://www.reddit.com/*', 'https://old.reddit.com/*'],
    // The user's Mochiscout instance; requested when they save settings.
    optional_host_permissions: ['https://*/*', 'http://localhost/*'],
  },
})
