<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'app' })
useHead({ title: 'Settings · social-radar' })

const { data: settings, refresh } = await useFetch('/api/settings')

const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC']
const hours = Array.from({ length: 24 }, (_, h) => h)

const form = reactive({
  timezone: settings.value?.timezone ?? 'UTC',
  digestHour: settings.value?.digestHour ?? 8,
  redditUsername: settings.value?.redditUsername ?? '',
  redditKarma: settings.value?.redditKarma != null ? String(settings.value.redditKarma) : '',
  redditAccountCreatedAt: settings.value?.redditAccountCreatedAt ?? '',
})
const saving = ref(false)

function useBrowserTimezone() {
  form.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}

async function save() {
  saving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PATCH',
      body: {
        timezone: form.timezone,
        digestHour: Number(form.digestHour),
        redditUsername: form.redditUsername || null,
        redditKarma: String(form.redditKarma).trim() === '' ? null : Number(form.redditKarma),
        redditAccountCreatedAt: form.redditAccountCreatedAt || null,
      },
    })
    await refresh()
    toast.success('Settings saved')
  }
  catch (error) {
    toast.error((error as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Could not save settings')
  }
  finally {
    saving.value = false
  }
}

const keyRows = computed(() => settings.value
  ? [
      { label: 'Anthropic (onboarding, scoring, drafts)', env: 'ANTHROPIC_API_KEY', set: settings.value.keys.anthropic },
      { label: 'TinyFish search (discovery, research)', env: 'TINYFISH_API_KEY', set: settings.value.keys.tinyfish },
      { label: 'Brave search (fallback)', env: 'BRAVE_API_KEY', set: settings.value.keys.brave },
      { label: 'Resend (sign-in links, digest)', env: 'RESEND_API_KEY', set: settings.value.keys.resend },
      { label: 'GitHub sign-in', env: 'GITHUB_CLIENT_ID / _SECRET', set: settings.value.keys.github },
      { label: 'Google sign-in', env: 'GOOGLE_CLIENT_ID / _SECRET', set: settings.value.keys.google },
    ]
  : [])

const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs'
</script>

<template>
  <form class="mx-auto flex max-w-2xl flex-col gap-6" @submit.prevent="save">
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>

    <Card>
      <CardHeader>
        <CardTitle>Daily digest</CardTitle>
        <CardDescription>Sent to {{ settings?.email }} at this hour, your time.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <Label for="tz">Time zone</Label>
          <select id="tz" v-model="form.timezone" :class="selectClass">
            <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
          </select>
          <button type="button" class="self-start text-xs text-muted-foreground underline" @click="useBrowserTimezone">Use this device's time zone</button>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="hour">Digest hour</Label>
          <select id="hour" v-model="form.digestHour" :class="selectClass">
            <option v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}:00</option>
          </select>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Your Reddit account</CardTitle>
        <CardDescription>Never your password. The username is checked publicly for suspensions and shadowbans; karma and age are checked against each subreddit's minimums.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-2">
          <Label for="username">Username</Label>
          <Input id="username" v-model="form.redditUsername" placeholder="u/yourname" />
          <p v-if="settings?.redditAccountStatus === 'not_found'" class="text-xs text-destructive">
            Profile not publicly visible: the account may be suspended or shadowbanned.
          </p>
          <p v-else-if="settings?.redditAccountStatus === 'ok'" class="text-xs text-muted-foreground">Profile visible.</p>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="karma">Karma</Label>
          <Input id="karma" v-model="form.redditKarma" type="number" inputmode="numeric" placeholder="e.g. 1200" />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="created">Account created</Label>
          <Input id="created" v-model="form.redditAccountCreatedAt" type="date" />
        </div>
      </CardContent>
    </Card>

    <Card v-if="settings?.edition === 'selfhost'">
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>Set with <code>wrangler secret put NAME</code> (or <code>.dev.vars</code> locally).</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col divide-y text-sm">
        <div v-for="k in keyRows" :key="k.env" class="flex items-center justify-between gap-3 py-2">
          <div>
            <div>{{ k.label }}</div>
            <code class="text-xs text-muted-foreground">{{ k.env }}</code>
          </div>
          <Badge :variant="k.set ? 'secondary' : 'outline'">{{ k.set ? 'Set' : 'Not set' }}</Badge>
        </div>
      </CardContent>
    </Card>

    <div>
      <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save settings' }}</Button>
    </div>
  </form>
</template>
