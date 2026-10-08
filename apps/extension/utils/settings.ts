export interface Settings {
  instanceUrl: string
  apiKey: string
}

export interface Stats {
  sent: number
  lastSentAt: string | null
  lastError: string | null
}

export const settingsItem = storage.defineItem<Settings | null>('local:settings', { fallback: null })
export const statsItem = storage.defineItem<Stats>('local:stats', { fallback: { sent: 0, lastSentAt: null, lastError: null } })
