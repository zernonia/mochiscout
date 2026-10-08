import { settingsItem, statsItem } from '../../utils/settings'

const form = document.querySelector<HTMLFormElement>('#form')!
const url = document.querySelector<HTMLInputElement>('#url')!
const key = document.querySelector<HTMLInputElement>('#key')!
const status = document.querySelector<HTMLDivElement>('#status')!

async function render() {
  const [settings, stats] = await Promise.all([settingsItem.getValue(), statsItem.getValue()])
  if (settings) {
    url.value = settings.instanceUrl
    key.value = settings.apiKey
  }
  status.className = stats.lastError ? 'error' : ''
  status.textContent = stats.lastError
    ? `Last send failed: ${stats.lastError}`
    : stats.sent
      ? `${stats.sent} posts sent${stats.lastSentAt ? `, last ${new Date(stats.lastSentAt).toLocaleString()}` : ''}.`
      : settings ? 'Browse Reddit; posts are sent as you go.' : 'Create an API key in social-radar → Settings.'
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const origin = new URL(url.value).origin
  const granted = await browser.permissions.request({ origins: [`${origin}/*`] })
  if (!granted) {
    status.className = 'error'
    status.textContent = 'Permission to reach your instance is needed.'
    return
  }
  await settingsItem.setValue({ instanceUrl: origin, apiKey: key.value.trim() })
  await statsItem.setValue({ sent: 0, lastSentAt: null, lastError: null })
  await render()
})

render()
