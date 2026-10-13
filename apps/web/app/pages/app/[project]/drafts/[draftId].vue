<script setup lang="ts">
import { SendIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const draftId = String(route.params.draftId)
// Lazy: the page renders at once with a skeleton; the form fills when the draft arrives.
const { data: draft, error } = useCachedFetch(() => `/api/projects/${projectId.value}/drafts/${draftId}`)
watch(error, (e) => { if (e) showError({ statusCode: 404, statusMessage: 'Draft not found', fatal: true }) })
useHead({ title: () => `${draft.value?.title || 'Draft'} · Mochiscout` })
type Draft = NonNullable<typeof draft.value>
const url: string = `/api/projects/${projectId.value}/drafts/${draftId}`

const form = reactive({ title: '', body: '', promo: false })
let formFilled = false
watch(draft, (d) => {
  if (!d || formFilled) return
  formFilled = true
  Object.assign(form, { title: d.title ?? '', body: d.body ?? '', promo: d.promo ?? false })
}, { immediate: true })
const dirty = computed(() => form.title !== draft.value?.title || form.body !== draft.value?.body || form.promo !== draft.value?.promo)
const busy = ref<'save' | 'check' | 'delete' | null>(null)

function message(e: unknown, fallback: string) {
  return (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? fallback
}

async function save() {
  busy.value = 'save'
  try {
    draft.value = await $fetch<Draft>(url, { method: 'PATCH', body: form })
  }
  catch (e) {
    toast.error(message(e, 'Could not save'))
  }
  finally {
    busy.value = null
  }
}

async function check() {
  if (dirty.value) await save()
  busy.value = 'check'
  try {
    draft.value = await $fetch<Draft>(`${url}/check`, { method: 'POST' })
  }
  catch (e) {
    toast.error(message(e, 'Could not check'))
  }
  finally {
    busy.value = null
  }
}

async function remove() {
  if (!confirm('Delete this draft?')) return
  busy.value = 'delete'
  await $fetch(url, { method: 'DELETE' })
  await navigateTo(`/app/${projectId.value}/drafts`)
}

const postedUrl = ref('')
async function markPosted() {
  busy.value = 'save'
  try {
    await $fetch(`/api/projects/${projectId.value}/tracker`, {
      method: 'POST',
      body: { url: postedUrl.value, promo: form.promo, draftId },
    })
    toast.success('Tracking the post. Removals show up on the Tracker.')
    await navigateTo(`/app/${projectId.value}/tracker`)
  }
  catch (e) {
    toast.error(message(e, 'Could not track the post'))
  }
  finally {
    busy.value = null
  }
}

async function copy(text: string, what: string) {
  await navigator.clipboard.writeText(text)
  toast.success(`${what} copied`)
}
</script>

<template>
  <SkeletonCards v-if="!draft" :count="2" :lines="4" />
  <div v-else class="flex flex-col gap-5">
    <NuxtLink :to="`/app/${projectId}/drafts`" class="text-sm text-muted-foreground hover:text-foreground">← All drafts</NuxtLink>
    <AppPageHeader :title="draft.title || 'Untitled draft'">
      <template #meta>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <SourceAvatar :channel="draft.subreddit" size="sm" />
          <a :href="`https://www.reddit.com/r/${draft.subreddit}/`" target="_blank" rel="noopener" class="font-medium text-foreground hover:underline">r/{{ draft.subreddit }}</a>
          <span class="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-foreground capitalize">{{ draft.angle }}</span>
        </div>
      </template>
    </AppPageHeader>

    <div class="grid gap-5 lg:grid-cols-[1fr_320px]">
      <form class="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5" @submit.prevent="save">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label for="title">Title</Label>
            <span class="text-xs" :class="form.title.length > 300 ? 'text-destructive' : 'text-muted-foreground'">{{ form.title.length }}/300</span>
          </div>
          <Input id="title" v-model="form.title" />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="body">Body</Label>
          <Textarea id="body" v-model="form.body" rows="16" class="text-sm leading-relaxed" />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <Switch :model-value="draft.angle === 'showcase' || form.promo" :disabled="draft.angle === 'showcase'" @update:model-value="(v: boolean) => (form.promo = v)" />
          Mentions the product (promo post)
        </label>
        <div class="flex flex-wrap gap-2">
          <Button type="submit" :disabled="!!busy || !dirty">{{ busy === 'save' ? 'Saving…' : 'Save' }}</Button>
          <Button type="button" variant="outline" :disabled="!!busy" @click="check">{{ busy === 'check' ? 'Checking…' : 'Check again' }}</Button>
          <Button type="button" variant="ghost" :disabled="!!busy" @click="remove">Delete</Button>
        </div>
      </form>

      <div class="flex flex-col gap-4">
        <CheckReport :report="draft.check" />
        <div class="flex flex-col gap-2 rounded-2xl border bg-gradient-to-br from-brand-soft/60 via-card to-card p-4 shadow-xs/5">
          <div class="flex items-center gap-2 text-sm font-medium"><SendIcon class="size-4 text-brand" /> Post it yourself</div>
          <Button variant="outline" size="sm" @click="copy(form.title, 'Title')">Copy title</Button>
          <Button variant="outline" size="sm" @click="copy(form.body, 'Body')">Copy body</Button>
          <Button as-child size="sm">
            <a :href="`https://www.reddit.com/r/${draft.subreddit}/submit`" target="_blank" rel="noopener">Open r/{{ draft.subreddit }} submit page</a>
          </Button>
          <form class="mt-2 flex flex-col gap-2 border-t pt-3" @submit.prevent="markPosted">
            <Label for="posted-url" class="text-xs">Posted? Paste the link to track it</Label>
            <Input id="posted-url" v-model="postedUrl" placeholder="https://www.reddit.com/r/…/comments/…" required />
            <Button type="submit" size="sm" variant="secondary" :disabled="!!busy">Mark as posted</Button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
