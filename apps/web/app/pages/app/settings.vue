<script setup lang="ts">
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })
useHead({ title: 'Settings · Mochiscout' })

// Lazy: the page renders at once and each card fills in as its data arrives.
const { data: settings, refresh } = useCachedFetch('/api/settings')
const { data: team, refresh: refreshTeam } = useCachedFetch('/api/org')
const { data: myInvites, refresh: refreshMyInvites } = useCachedFetch('/api/org/invites/mine')
const { data: apiKeys, refresh: refreshKeys } = useCachedFetch('/api/api-keys')
const keyLabel = ref('Browser extension')
const newKey = ref<string | null>(null)
const mcpUrl = computed(() => (import.meta.client ? `${location.origin}/mcp` : '/mcp'))
const mcpCommand = computed(() => `claude mcp add --transport http mochiscout ${mcpUrl.value} --header "Authorization: Bearer ${newKey.value}"`)
async function createKey() {
  try {
    const res = await $fetch('/api/api-keys', { method: 'POST', body: { label: keyLabel.value } })
    newKey.value = res.key
    await refreshKeys()
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 402) toast.error(errorText(error, 'Could not create the key'))
  }
}
async function revokeKey(id: string) {
  if (!confirm('Revoke this key? Agents using it stop working.')) return
  await $fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
  await refreshKeys()
}
async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Copied')
}

const inviteEmail = ref('')
function errorText(error: unknown, fallback: string) {
  return (error as { data?: { statusMessage?: string } }).data?.statusMessage ?? fallback
}
async function invite() {
  try {
    await $fetch('/api/org/invites', { method: 'POST', body: { email: inviteEmail.value } })
    inviteEmail.value = ''
    await refreshTeam()
    toast.success('Invite sent')
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 402) toast.error(errorText(error, 'Could not invite'))
  }
}
async function cancelInvite(id: string) {
  await $fetch(`/api/org/invites/${id}`, { method: 'DELETE' })
  await refreshTeam()
}
async function removeMember(userId: string) {
  if (!confirm('Remove this teammate?')) return
  await $fetch(`/api/org/members/${userId}`, { method: 'DELETE' })
  await refreshTeam()
}
async function leaveTeam() {
  if (!confirm('Leave this team? You lose access to its projects.')) return
  await $fetch('/api/org/leave', { method: 'POST' })
  window.location.href = '/app'
}
async function acceptInvites() {
  await $fetch('/api/org/invites/accept', { method: 'POST' })
  await Promise.all([refreshMyInvites(), refreshTeam()])
  toast.success('Joined the team')
}

const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC']
const hours = Array.from({ length: 24 }, (_, h) => h)

const form = reactive({ timezone: 'UTC', digestHour: 8, redditUsername: '', redditKarma: '', redditAccountCreatedAt: '' })
// Fill the form once, when the settings first arrive (later refreshes don't overwrite typing).
let formFilled = false
watch(settings, (s) => {
  if (!s || formFilled) return
  formFilled = true
  Object.assign(form, {
    timezone: s.timezone ?? 'UTC',
    digestHour: s.digestHour ?? 8,
    redditUsername: s.redditUsername ?? '',
    redditKarma: s.redditKarma != null ? String(s.redditKarma) : '',
    redditAccountCreatedAt: s.redditAccountCreatedAt ?? '',
  })
}, { immediate: true })
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
      { label: `Email (digest, invites)${settings.value.keys.email ? `: ${settings.value.keys.email === 'cloudflare' ? 'Cloudflare' : 'Resend'}` : ''}`, env: 'EMAIL binding + EMAIL_FROM, or RESEND_API_KEY', set: Boolean(settings.value.keys.email) },
      { label: 'GitHub sign-in', env: 'NUXT_OAUTH_GITHUB_CLIENT_ID / _SECRET', set: settings.value.keys.github },
      { label: 'Google sign-in', env: 'NUXT_OAUTH_GOOGLE_CLIENT_ID / _SECRET', set: settings.value.keys.google },
    ]
  : [])

</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <AppPageHeader title="Settings" description="Your digest, Reddit account, team and API keys." />

    <Alert v-if="myInvites?.length">
      <AlertTitle>You're invited to a team</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ myInvites.map(i => i.invitedBy).filter(Boolean).join(', ') || 'Someone' }} invited you.
        <Button size="sm" type="button" @click="acceptInvites">Join</Button>
      </AlertDescription>
    </Alert>

    <!-- Team and API key cards hold their own forms, so this form ends before them. -->
    <SkeletonCards v-if="!settings" :count="2" :lines="2" />
    <form v-else class="flex flex-col gap-6" @submit.prevent="save">
      <Card>
        <CardHeader>
          <CardTitle>Daily digest</CardTitle>
          <CardDescription>Sent to {{ settings?.email }} at this hour, your time.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <Label for="tz">Time zone</Label>
            <Select v-model="form.timezone">
              <SelectTrigger id="tz"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</SelectItem>
              </SelectContent>
            </Select>
            <button type="button" class="self-start text-xs text-muted-foreground underline" @click="useBrowserTimezone">Use this device's time zone</button>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="hour">Digest hour</Label>
            <Select v-model="form.digestHour">
              <SelectTrigger id="hour"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="-1">Off</SelectItem>
                <SelectItem v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}:00</SelectItem>
              </SelectContent>
            </Select>
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

      <div>
        <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save settings' }}</Button>
      </div>
    </form>

    <Card v-if="team">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>Teammates share projects, the inbox and drafts.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <div v-for="m in team.members" :key="m.userId" class="flex items-center justify-between gap-3">
          <div class="min-w-0 truncate">{{ m.email }} <span class="text-muted-foreground">· {{ m.role }}</span></div>
          <button v-if="team.role === 'owner' && m.userId !== team.me" type="button" class="text-xs text-muted-foreground underline" @click="removeMember(m.userId)">Remove</button>
        </div>
        <div v-for="i in team.invites" :key="i.id" class="flex items-center justify-between gap-3 text-muted-foreground">
          <div class="min-w-0 truncate">{{ i.email }} · invited</div>
          <button v-if="team.role === 'owner'" type="button" class="text-xs underline" @click="cancelInvite(i.id)">Cancel</button>
        </div>
        <button v-if="team.role !== 'owner'" type="button" class="self-start text-xs text-muted-foreground underline" @click="leaveTeam">Leave this team</button>
        <form v-if="team.role === 'owner'" class="flex gap-2 pt-1" @submit.prevent="invite">
          <Input v-model="inviteEmail" type="email" placeholder="teammate@example.com" required class="flex-1" />
          <Button type="submit" variant="secondary">Invite</Button>
        </form>
      </CardContent>
    </Card>

    <Card v-if="apiKeys">
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>For the browser extension and for AI agents like Claude Code (MCP). Neither ever posts for you.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <div v-if="newKey" class="flex flex-col gap-2 rounded-md border bg-muted p-3">
          <div class="font-medium">Copy this key now. It won't be shown again.</div>
          <code class="break-all text-xs">{{ newKey }}</code>
          <template v-if="apiKeys.mcpAllowed">
            <div class="text-xs text-muted-foreground">Add it to Claude Code:</div>
            <code class="break-all text-xs">{{ mcpCommand }}</code>
          </template>
          <div class="flex gap-2">
            <Button size="sm" type="button" variant="outline" @click="copyText(newKey)">Copy key</Button>
            <Button v-if="apiKeys.mcpAllowed" size="sm" type="button" variant="outline" @click="copyText(mcpCommand)">Copy command</Button>
          </div>
        </div>
        <div v-for="k in apiKeys.keys" :key="k.id" class="flex items-center justify-between gap-3">
          <div class="min-w-0 truncate">{{ k.label }} <code class="text-xs text-muted-foreground">{{ k.prefix }}…</code></div>
          <button type="button" class="text-xs text-muted-foreground underline" @click="revokeKey(k.id)">Revoke</button>
        </div>
        <form class="flex gap-2 pt-1" @submit.prevent="createKey">
          <Input v-model="keyLabel" placeholder="Label" required class="flex-1" />
          <Button type="submit" variant="secondary">Create key</Button>
        </form>
        <p v-if="!apiKeys.mcpAllowed" class="text-xs text-muted-foreground">The MCP server for AI agents is part of the Pro plan. <NuxtLink to="/app/billing?plan=pro" class="underline">Upgrade</NuxtLink></p>
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

  </div>
</template>
