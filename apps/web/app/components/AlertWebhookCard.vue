<script setup lang="ts">
import { BellIcon, SendIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

const props = defineProps<{ projectId: string, initialUrl: string | null }>()
const { data: me } = useCachedFetch('/api/me')

const url = ref(props.initialUrl ?? '')
const saved = ref(props.initialUrl ?? '')
const saving = ref(false)
const testing = ref(false)
const kind = computed(() => {
  if (/^https:\/\/hooks\.slack\.com\/services\//.test(saved.value)) return 'Slack'
  if (/^https:\/\/(\w+\.)?discord(app)?\.com\/api\/webhooks\//.test(saved.value)) return 'Discord'
  return null
})

async function save() {
  saving.value = true
  try {
    const res = await $fetch(`/api/projects/${props.projectId}/alert-webhook`, { method: 'PUT', body: { url: url.value.trim() || null } })
    saved.value = res.url ?? ''
    url.value = saved.value
    toast.success(res.url ? `Hot leads will also go to ${res.kind === 'slack' ? 'Slack' : 'Discord'}.` : 'Webhook removed.')
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(apiErrorMessage(error, 'Could not save the webhook'))
  }
  finally {
    saving.value = false
  }
}

async function test() {
  testing.value = true
  try {
    await $fetch(`/api/projects/${props.projectId}/alert-webhook/test`, { method: 'POST' })
    toast.success(`Test message sent to ${kind.value}.`)
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'The test message failed'))
  }
  finally {
    testing.value = false
  }
}
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-4">
      <div>
        <h2 class="flex items-center gap-2 font-semibold">
          <BellIcon class="size-4 text-orange-600 dark:text-orange-400" /> Hot lead alerts in Slack or Discord
          <span v-if="me && !me.limits.hotAlerts" class="rounded-full bg-violet-500/12 px-1.5 text-[10px] leading-4 font-medium text-violet-700 dark:text-violet-400">Solo+</span>
        </h2>
        <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
          Hot leads are posted to a channel as well as emailed, at most once an hour. Create an incoming webhook in
          <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener" class="underline">Slack</a> or
          <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener" class="underline">Discord</a> and paste its URL.
          Turn alerts on or off with "Hot lead alerts" in the inbox.
        </p>
      </div>
      <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="save">
        <Input v-model="url" type="url" placeholder="https://hooks.slack.com/services/…" class="flex-1" aria-label="Webhook URL" />
        <Button type="submit" size="sm" :loading="saving" :disabled="url.trim() === saved">{{ url.trim() || !saved ? 'Save' : 'Remove' }}</Button>
        <Button v-if="kind" type="button" size="sm" variant="outline" :loading="testing" @click="test"><SendIcon /> Send a test</Button>
      </form>
    </CardContent>
  </Card>
</template>
