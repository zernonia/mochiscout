<script setup lang="ts">
import { FileTextIcon, PenLineIcon, SparklesIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const { data: project } = useCachedFetch(() => `/api/projects/${projectId.value}`)
const { data: drafts } = useCachedFetch(() => `/api/projects/${projectId.value}/drafts`)
const { data: map } = useCachedFetch(() => `/api/projects/${projectId.value}/subreddits`)
const { data: research } = useCachedFetch(() => `/api/projects/${projectId.value}/research`)
useHead({ title: () => `Drafts · ${project.value?.name ?? 'Project'}` })

const angles = [
  { value: 'story', label: 'Story', hint: 'Something that happened, told honestly' },
  { value: 'lesson', label: 'Lesson', hint: 'A useful how-to' },
  { value: 'question', label: 'Question', hint: 'Ask the community' },
  { value: 'showcase', label: 'Showcase', hint: '"I built this", always a promo post' },
] as const

// Prefill from Today's post suggestion (?subreddit=&angle=&promo=&topic=).
const q = route.query
const queryAngle = angles.find(a => a.value === q.angle)?.value
const form = reactive({
  subreddit: typeof q.subreddit === 'string' ? q.subreddit : map.value?.subreddits.find(s => s.watching)?.name ?? '',
  angle: (queryAngle ?? 'story') as typeof angles[number]['value'],
  promo: q.promo === '1',
  topic: typeof q.topic === 'string' ? q.topic : '',
})
const busy = ref<'generate' | 'empty' | null>(null)

// Default to the first watched subreddit once the map arrives.
watch(map, (m) => {
  if (!form.subreddit) form.subreddit = m?.subreddits.find(s => s.watching)?.name ?? ''
}, { immediate: true })

const watched = computed(() => map.value?.subreddits.filter(s => s.watching).map(s => s.name) ?? [])
const topics = computed(() => research.value?.points.map(p => p.title) ?? [])

async function create(generate: boolean) {
  busy.value = generate ? 'generate' : 'empty'
  try {
    const draft = await $fetch(`/api/projects/${projectId.value}/drafts`, {
      method: 'POST',
      body: { ...form, topic: form.topic || null, generate },
    })
    await navigateTo(`/app/${projectId.value}/drafts/${draft!.id}`)
  }
  catch (error) {
    toast.error((error as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Could not create the draft')
  }
  finally {
    busy.value = null
  }
}

const level = {
  pass: { label: 'Passes rules', class: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  warn: { label: 'Check warnings', class: 'bg-amber-500/14 text-amber-800 dark:text-amber-400', dot: 'bg-amber-500' },
  fail: { label: 'Breaks rules', class: 'bg-red-500/12 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
} as const
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppPageHeader title="Drafts" :icon="FileTextIcon" description="Write posts with each subreddit's rules checked as you go. You review, edit and post them yourself." />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section class="flex min-w-0 flex-col gap-4 rounded-2xl border bg-gradient-to-br from-brand-soft/60 via-card to-card p-5 shadow-xs/5">
        <div class="flex items-start gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-foreground"><PenLineIcon class="size-4" /></span>
          <div>
            <h2 class="font-semibold">New post</h2>
            <p class="text-sm text-muted-foreground">Pick a subreddit and an angle. To answer a thread, use Draft reply in your inbox.</p>
          </div>
        </div>
        <form class="flex flex-col gap-4" @submit.prevent="create(true)">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div class="flex flex-col gap-2">
              <Label for="sub">Subreddit</Label>
              <Input id="sub" v-model="form.subreddit" list="watched-subs" placeholder="r/subreddit" required />
              <datalist id="watched-subs">
                <option v-for="s in watched" :key="s" :value="s" />
              </datalist>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="angle">Angle</Label>
              <Select v-model="form.angle">
                <SelectTrigger id="angle" class="min-w-0"><SelectValue class="truncate" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="a in angles" :key="a.value" :value="a.value">{{ a.label }}: {{ a.hint }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="topic">Topic (optional)</Label>
            <Input id="topic" v-model="form.topic" list="pain-topics" placeholder="e.g. a pain point from Research" />
            <datalist id="pain-topics">
              <option v-for="t in topics" :key="t" :value="t" />
            </datalist>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <Switch :model-value="form.angle === 'showcase' || form.promo" :disabled="form.angle === 'showcase'" @update:model-value="(v: boolean) => (form.promo = v)" />
            Mention {{ project?.name }} (counts as a promo post)
          </label>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" :disabled="!!busy"><SparklesIcon /> {{ busy === 'generate' ? 'Writing…' : 'Write a draft' }}</Button>
            <Button type="button" variant="outline" :disabled="!!busy" @click="create(false)"><PenLineIcon /> Start empty</Button>
          </div>
        </form>
      </section>

      <section class="flex min-w-0 flex-col gap-2">
        <h2 class="flex items-center justify-between text-sm font-medium text-muted-foreground">
          Your drafts <span v-if="drafts?.length" class="tabular-nums">{{ drafts.length }}</span>
        </h2>
        <SkeletonCards v-if="!drafts" :count="2" :lines="1" />
        <AppEmpty v-else-if="!drafts.length" title="No drafts yet" description="Drafts you write appear here with their rule check." />
        <NuxtLink
          v-for="d in drafts"
          :key="d.id"
          :to="`/app/${projectId}/drafts/${d.id}`"
          class="flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-xs/5 transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-sm"
        >
          <SourceAvatar :channel="d.subreddit" />
          <div class="flex min-w-0 flex-1 flex-col gap-1">
          <div class="truncate text-sm font-medium">{{ d.title || 'Untitled draft' }}</div>
          <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>r/{{ d.subreddit }}</span>
            <span>· {{ d.angle }}</span>
            <span v-if="d.promo">· promo</span>
            <span v-if="d.check" class="ms-auto inline-flex items-center gap-1 rounded-full px-1.5 leading-5 font-medium" :class="level[d.check.level].class">
              <span class="size-1.5 rounded-full" :class="level[d.check.level].dot" />{{ level[d.check.level].label }}
            </span>
          </div>
          </div>
        </NuxtLink>
      </section>
    </div>
  </div>
</template>
