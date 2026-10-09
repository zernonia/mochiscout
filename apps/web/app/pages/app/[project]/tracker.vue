<script setup lang="ts">
import { ActivityIcon, CheckCircle2Icon, CircleAlertIcon, CircleHelpIcon, ShieldAlertIcon, ShieldCheckIcon, TrashIcon, UserIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useLazyFetch(() => `/api/projects/${projectId.value}`)
const { data: tracker, refresh } = useLazyFetch(() => `/api/projects/${projectId.value}/tracker`)
useHead({ title: () => `Tracker · ${project.value?.name ?? 'Project'}` })

const form = reactive({ url: '', promo: true })
const adding = ref(false)

const statusInfo = {
  live: { label: 'Live', class: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2Icon, hint: 'Visible to everyone.' },
  removed: { label: 'Removed', class: 'bg-red-500/12 text-red-700 dark:text-red-400', dot: 'bg-red-500', icon: CircleAlertIcon, hint: 'Removed by mods or deleted. Only you can still see it.' },
  not_listed: { label: 'Not listed', class: 'bg-amber-500/14 text-amber-800 dark:text-amber-400', dot: 'bg-amber-500', icon: CircleAlertIcon, hint: 'Not in the subreddit\'s new posts: likely held by the spam filter. Message the mods.' },
  unknown: { label: 'Checking', class: 'bg-muted text-muted-foreground', dot: 'bg-neutral-400', icon: CircleHelpIcon, hint: 'Not checked yet. Usually within a minute.' },
} as const

const summary = computed(() => {
  const posts = tracker.value?.posts ?? []
  return {
    live: posts.filter(p => p.status === 'live').length,
    problems: posts.filter(p => p.status === 'removed' || p.status === 'not_listed').length,
  }
})

async function add() {
  adding.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/tracker`, { method: 'POST', body: form })
    form.url = ''
    await refresh()
    setTimeout(() => { refresh(); refreshNuxtData('project-nav') }, 8000)
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
  return d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Tracker" description="Paste the posts you publish. We check every 12 hours that they're still visible, so you hear about removals early." />

    <!-- Account health -->
    <Skeleton v-if="!tracker" class="h-[74px] w-full rounded-xl" />
    <div
      v-else
      class="flex items-start gap-3 rounded-xl border p-4"
      :class="tracker?.account?.status === 'not_found' ? 'border-red-500/30 bg-red-500/5' : tracker?.account?.status === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-card'"
    >
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg"
        :class="tracker?.account?.status === 'not_found' ? 'bg-red-500/12 text-red-700 dark:text-red-400' : tracker?.account?.status === 'ok' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'"
      >
        <ShieldAlertIcon v-if="tracker?.account?.status === 'not_found'" class="size-5" />
        <ShieldCheckIcon v-else-if="tracker?.account?.status === 'ok'" class="size-5" />
        <UserIcon v-else class="size-5" />
      </span>
      <div class="min-w-0 text-sm">
        <template v-if="!tracker?.account?.username">
          <div class="font-medium">Reddit account not set</div>
          <p class="text-muted-foreground">Add your Reddit username in <NuxtLink to="/app/settings" class="underline">Settings</NuxtLink> and we'll check it for shadowbans.</p>
        </template>
        <template v-else-if="tracker.account.status === 'not_found'">
          <div class="font-medium text-red-700 dark:text-red-400">u/{{ tracker.account.username }} is not publicly visible</div>
          <p class="text-muted-foreground">The account may be suspended or shadowbanned, so nobody sees your posts. Check reddit.com/appeals.</p>
        </template>
        <template v-else>
          <div class="font-medium">u/{{ tracker.account.username }} {{ tracker.account.status === 'ok' ? 'looks healthy' : 'not checked yet' }}</div>
          <p class="text-muted-foreground">Profile {{ tracker.account.status === 'ok' ? 'is publicly visible' : 'will be checked soon' }} · checked {{ when(tracker.account.checkedAt as unknown as string | null) }}</p>
        </template>
      </div>
    </div>

    <form class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs/5" @submit.prevent="add">
      <Label for="url">Track a post you made</Label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <Input id="url" v-model="form.url" placeholder="https://www.reddit.com/r/…/comments/…" required class="flex-1" />
        <Button type="submit" :loading="adding"><ActivityIcon /> Track</Button>
      </div>
      <Label class="font-normal text-muted-foreground">
        <Switch v-model="form.promo" /> Promo post (counts toward cooldowns)
      </Label>
    </form>

    <div v-if="tracker?.posts.length" class="flex items-center gap-4 text-sm">
      <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-emerald-500" /> {{ summary.live }} live</span>
      <span class="inline-flex items-center gap-1.5" :class="summary.problems > 0 ? 'font-medium text-red-700 dark:text-red-400' : ''"><span class="size-2 rounded-full bg-red-500" /> {{ summary.problems }} removed or hidden</span>
    </div>

    <SkeletonCards v-if="!tracker" :count="2" :lines="2" />
    <Empty v-else-if="!tracker.posts.length" class="rounded-xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><ActivityIcon /></EmptyMedia>
        <EmptyTitle>No tracked posts</EmptyTitle>
        <EmptyDescription>After you post, paste the link above. We check it every 12 hours for removals.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div class="flex flex-col gap-2">
      <div v-for="p in tracker?.posts" :key="p.id" class="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs/5">
        <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" :class="statusInfo[p.status].class">
          <component :is="statusInfo[p.status].icon" class="size-4" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded-full px-2 py-0.5 font-medium" :class="statusInfo[p.status].class">{{ statusInfo[p.status].label }}</span>
            <span class="font-medium text-foreground">r/{{ p.subreddit }}</span>
            <span v-if="p.promo">Promo</span>
            <span>Checked {{ when(p.lastCheckedAt as unknown as string | null) }}</span>
          </div>
          <a :href="p.url" target="_blank" rel="noopener" class="truncate font-medium hover:underline">{{ p.title || p.url }}</a>
          <p class="text-sm text-muted-foreground">{{ statusInfo[p.status].hint }}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Stop tracking" @click="remove(p.id)"><TrashIcon /></Button>
      </div>
    </div>
  </div>
</template>
