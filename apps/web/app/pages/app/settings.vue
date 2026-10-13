<script setup lang="ts">
import { AtSignIcon, BellRingIcon, CircleCheckIcon, CircleDashedIcon, KeyRoundIcon, MailIcon, ServerCogIcon, SettingsIcon, UsersIcon } from '@lucide/vue'
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
  <div class="mx-auto flex max-w-4xl flex-col gap-8">
    <AppPageHeader title="Settings" description="Your digest, Reddit account, team and API keys." :icon="SettingsIcon" />

    <Alert v-if="myInvites?.length" class="rounded-2xl border-brand/20 bg-brand-soft/40 [&>svg]:text-brand">
      <MailIcon />
      <AlertTitle>You're invited to a team</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ myInvites.map(i => i.invitedBy).filter(Boolean).join(', ') || 'Someone' }} invited you.
        <Button size="sm" type="button" @click="acceptInvites">Join</Button>
      </AlertDescription>
    </Alert>

    <!-- Team and API key cards hold their own forms, so this form ends before them. -->
    <SkeletonCards v-if="!settings" :count="2" :lines="2" />
    <form v-else class="flex flex-col gap-8" @submit.prevent="save">
      <FormSection title="Daily digest" :description="`Sent to ${settings?.email} at this hour, your time.`" :icon="BellRingIcon">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="tz">Time zone</Label>
            <Select v-model="form.timezone">
              <SelectTrigger id="tz"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</SelectItem>
              </SelectContent>
            </Select>
            <button type="button" class="self-start text-xs text-muted-foreground underline decoration-brand/40 underline-offset-2 hover:text-brand-foreground" @click="useBrowserTimezone">Use this device's time zone</button>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="hour">Digest hour</Label>
            <Select v-model="form.digestHour">
              <SelectTrigger id="hour"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="-1">Off</SelectItem>
                <SelectItem v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}:00</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      <FormSection title="Your Reddit account" description="Never your password." :icon="AtSignIcon">
        <div class="flex flex-col gap-4">
          <p class="text-sm text-pretty text-muted-foreground">The username is checked publicly for suspensions and shadowbans; karma and age are checked against each subreddit's minimums.</p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="flex min-w-0 flex-col gap-2">
              <Label for="username">Username</Label>
              <Input id="username" v-model="form.redditUsername" placeholder="u/yourname" />
              <p v-if="settings?.redditAccountStatus === 'not_found'" class="text-xs text-destructive">
                Profile not publicly visible: the account may be suspended or shadowbanned.
              </p>
              <p v-else-if="settings?.redditAccountStatus === 'ok'" class="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><CircleCheckIcon class="size-3.5" /> Profile visible.</p>
            </div>
            <div class="flex min-w-0 flex-col gap-2">
              <Label for="karma">Karma</Label>
              <Input id="karma" v-model="form.redditKarma" type="number" inputmode="numeric" placeholder="e.g. 1200" />
            </div>
            <div class="flex min-w-0 flex-col gap-2">
              <Label for="created">Account created</Label>
              <Input id="created" v-model="form.redditAccountCreatedAt" type="date" />
            </div>
          </div>
        </div>
      </FormSection>

      <div class="grid md:grid-cols-[14rem_1fr] md:gap-8">
        <div class="max-md:hidden" />
        <div>
          <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save settings' }}</Button>
        </div>
      </div>
    </form>

    <Separator v-if="team || apiKeys" class="opacity-60" />

    <FormSection v-if="team" title="Team" description="Teammates share projects, the inbox and drafts." :icon="UsersIcon">
      <div class="flex flex-col gap-3 text-sm">
        <ul class="flex flex-col gap-1">
          <li v-for="m in team.members" :key="m.userId" class="flex items-center gap-3 rounded-xl px-1 py-1.5">
            <SourceAvatar :channel="m.email" size="md" />
            <div class="min-w-0 flex-1 truncate">{{ m.email }}</div>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="m.role === 'owner' ? 'bg-brand-soft text-brand-foreground' : 'bg-muted text-muted-foreground'">{{ m.role }}</span>
            <button v-if="team.role === 'owner' && m.userId !== team.me" type="button" class="text-xs text-muted-foreground underline hover:text-foreground" @click="removeMember(m.userId)">Remove</button>
          </li>
          <li v-for="i in team.invites" :key="i.id" class="flex items-center gap-3 rounded-xl px-1 py-1.5 text-muted-foreground">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed" aria-hidden="true"><MailIcon class="size-4" /></span>
            <div class="min-w-0 flex-1 truncate">{{ i.email }} · invited</div>
            <button v-if="team.role === 'owner'" type="button" class="text-xs underline hover:text-foreground" @click="cancelInvite(i.id)">Cancel</button>
          </li>
        </ul>
        <button v-if="team.role !== 'owner'" type="button" class="self-start text-xs text-muted-foreground underline" @click="leaveTeam">Leave this team</button>
        <form v-if="team.role === 'owner'" class="flex gap-2 border-t pt-4" @submit.prevent="invite">
          <Input v-model="inviteEmail" type="email" placeholder="teammate@example.com" required class="min-w-0 flex-1" aria-label="Teammate email" />
          <Button type="submit" variant="secondary">Invite</Button>
        </form>
      </div>
    </FormSection>

    <FormSection v-if="apiKeys" title="API keys" description="For the browser extension and for AI agents like Claude Code (MCP)." :icon="KeyRoundIcon">
      <div class="flex flex-col gap-3 text-sm">
        <p class="text-sm text-muted-foreground">Neither ever posts for you.</p>
        <div v-if="newKey" class="flex flex-col gap-2 rounded-xl bg-brand-soft/70 p-3">
          <div class="font-medium">Copy this key now. It won't be shown again.</div>
          <code class="rounded-lg bg-background/70 px-2 py-1 text-xs break-all">{{ newKey }}</code>
          <template v-if="apiKeys.mcpAllowed">
            <div class="text-xs text-muted-foreground">Add it to Claude Code:</div>
            <code class="rounded-lg bg-background/70 px-2 py-1 text-xs break-all">{{ mcpCommand }}</code>
          </template>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="outline" @click="copyText(newKey)">Copy key</Button>
            <Button v-if="apiKeys.mcpAllowed" size="sm" type="button" variant="outline" @click="copyText(mcpCommand)">Copy command</Button>
          </div>
        </div>
        <ul v-if="apiKeys.keys.length" class="flex flex-col gap-1">
          <li v-for="k in apiKeys.keys" :key="k.id" class="flex items-center gap-3 rounded-xl px-1 py-1.5">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true"><KeyRoundIcon class="size-4" /></span>
            <div class="min-w-0 flex-1 truncate">{{ k.label }} <code class="text-xs text-muted-foreground">{{ k.prefix }}…</code></div>
            <button type="button" class="text-xs text-muted-foreground underline hover:text-foreground" @click="revokeKey(k.id)">Revoke</button>
          </li>
        </ul>
        <form class="flex gap-2" :class="apiKeys.keys.length ? 'border-t pt-4' : ''" @submit.prevent="createKey">
          <Input v-model="keyLabel" placeholder="Label" required class="min-w-0 flex-1" aria-label="Key label" />
          <Button type="submit" variant="secondary">Create key</Button>
        </form>
        <p v-if="!apiKeys.mcpAllowed" class="text-xs text-muted-foreground">The MCP server for AI agents is part of the Pro plan. <NuxtLink to="/app/billing?plan=pro" class="font-medium text-brand-foreground underline underline-offset-2">Upgrade</NuxtLink></p>
      </div>
    </FormSection>

    <FormSection v-if="settings?.edition === 'selfhost'" title="API keys" :icon="ServerCogIcon">
      <template #description>Set with <code class="text-xs">wrangler secret put NAME</code> (or <code class="text-xs">.dev.vars</code> locally).</template>
      <ul class="flex flex-col divide-y text-sm">
        <li v-for="k in keyRows" :key="k.env" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div class="min-w-0">
            <div>{{ k.label }}</div>
            <code class="text-xs break-all text-muted-foreground">{{ k.env }}</code>
          </div>
          <span
            class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="k.set ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'"
          >
            <component :is="k.set ? CircleCheckIcon : CircleDashedIcon" class="size-3" aria-hidden="true" />{{ k.set ? 'Set' : 'Not set' }}
          </span>
        </li>
      </ul>
    </FormSection>
  </div>
</template>
