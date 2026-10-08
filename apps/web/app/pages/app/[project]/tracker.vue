<script setup lang="ts">
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = await useFetch(() => `/api/projects/${projectId.value}`)
const { data: tracker, refresh } = await useFetch(() => `/api/projects/${projectId.value}/tracker`)
useHead({ title: () => `Tracker · ${project.value?.name ?? 'Project'}` })

const form = reactive({ url: '', promo: true })
const adding = ref(false)

const statusInfo = {
  live: { label: 'Live', variant: 'secondary', hint: 'Visible to everyone.' },
  removed: { label: 'Removed', variant: 'destructive', hint: 'Removed by mods or deleted. Only you can still see it.' },
  not_listed: { label: 'Not listed', variant: 'destructive', hint: 'Not shown in the subreddit\'s new posts: likely held by the spam filter. Message the mods.' },
  unknown: { label: 'Checking', variant: 'outline', hint: 'Not checked yet.' },
} as const

async function add() {
  adding.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/tracker`, { method: 'POST', body: form })
    form.url = ''
    await refresh()
    setTimeout(refresh, 8000)
  }
  catch (error) {
    toast.error((error as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Could not track the post')
  }
  finally {
    adding.value = false
  }
}

async function remove(id: string) {
  await $fetch(`/api/projects/${projectId.value}/tracker/${id}`, { method: 'DELETE' })
  await refresh()
}

function when(d: string | null) {
  return d ? new Date(d).toLocaleString() : 'never'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <ProjectNav :project-id="projectId" :name="project?.name" />

    <Alert v-if="tracker?.account?.status === 'not_found'" variant="error">
      <AlertTitle>u/{{ tracker.account.username }} is not publicly visible</AlertTitle>
      <AlertDescription>The account may be suspended or shadowbanned, so nobody sees your posts. Check reddit.com/appeals.</AlertDescription>
    </Alert>
    <p v-else-if="!tracker?.account?.username" class="text-sm text-muted-foreground">
      Add your Reddit username in <NuxtLink to="/app/settings" class="underline">Settings</NuxtLink> to check it for shadowbans.
    </p>
    <p v-else class="text-sm text-muted-foreground">
      u/{{ tracker.account.username }}: {{ tracker.account.status === 'ok' ? 'profile visible' : 'not checked yet' }} · checked {{ when(tracker.account.checkedAt as unknown as string | null) }}
    </p>

    <form class="flex flex-col gap-2 rounded-xl border p-4" @submit.prevent="add">
      <Label for="url">Track a post you made</Label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <Input id="url" v-model="form.url" placeholder="https://www.reddit.com/r/…/comments/…" required class="flex-1" />
        <Button type="submit" :disabled="adding">Track</Button>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <Switch v-model="form.promo" /> Promo post (counts toward cooldowns)
      </label>
    </form>

    <div v-if="!tracker?.posts.length" class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      No tracked posts. Posts are checked every 12 hours for removals.
    </div>

    <div v-for="p in tracker?.posts" :key="p.id" class="flex flex-col gap-2 rounded-xl border p-4">
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge :variant="statusInfo[p.status].variant">{{ statusInfo[p.status].label }}</Badge>
        <span>r/{{ p.subreddit }}</span>
        <span v-if="p.promo">· promo</span>
        <span>· checked {{ when(p.lastCheckedAt as unknown as string | null) }}</span>
      </div>
      <a :href="p.url" target="_blank" rel="noopener" class="font-medium hover:underline">{{ p.title || p.url }}</a>
      <p class="text-sm text-muted-foreground">{{ statusInfo[p.status].hint }}</p>
      <button class="self-start text-xs text-muted-foreground underline" @click="remove(p.id)">Stop tracking</button>
    </div>
  </div>
</template>
