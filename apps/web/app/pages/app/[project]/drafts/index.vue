<script setup lang="ts">
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = computed(() => String(route.params.project))
const [{ data: project }, { data: drafts }, { data: map }, { data: research }] = await Promise.all([
  useFetch(() => `/api/projects/${projectId.value}`),
  useFetch(() => `/api/projects/${projectId.value}/drafts`),
  useFetch(() => `/api/projects/${projectId.value}/subreddits`),
  useFetch(() => `/api/projects/${projectId.value}/research`),
])
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

const levelBadge = { pass: 'secondary', warn: 'outline', fail: 'destructive' } as const
</script>

<template>
  <div class="flex flex-col gap-5">
    <ProjectNav :project-id="projectId" :name="project?.name" />

    <Card>
      <CardHeader>
        <CardTitle>New post</CardTitle>
        <CardDescription>You review, edit and post it yourself. Replies to threads are never drafted for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="create(true)">
          <div class="grid gap-4 sm:grid-cols-2">
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
                <SelectTrigger id="angle"><SelectValue /></SelectTrigger>
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
            <Button type="submit" :disabled="!!busy">{{ busy === 'generate' ? 'Writing…' : 'Write a draft' }}</Button>
            <Button type="button" variant="outline" :disabled="!!busy" @click="create(false)">Start empty</Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <div v-if="drafts?.length" class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-muted-foreground">Drafts</h2>
      <NuxtLink
        v-for="d in drafts"
        :key="d.id"
        :to="`/app/${projectId}/drafts/${d.id}`"
        class="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted"
      >
        <div class="min-w-0">
          <div class="truncate font-medium">{{ d.title || 'Untitled draft' }}</div>
          <div class="text-xs text-muted-foreground">r/{{ d.subreddit }} · {{ d.angle }}{{ d.promo ? ' · promo' : '' }}</div>
        </div>
        <Badge v-if="d.check" :variant="levelBadge[d.check.level]">{{ d.check.level }}</Badge>
      </NuxtLink>
    </div>
  </div>
</template>
