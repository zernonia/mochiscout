<script setup lang="ts">
import type { ProjectProfile } from '~/components/ProjectProfileForm.vue'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'app' })
useHead({ title: 'New project · social-radar' })

const url = ref('')
const analysing = ref(false)
const saving = ref(false)
const profile = ref<ProjectProfile | null>(null)

function blank(u = ''): ProjectProfile {
  return { url: u, name: '', category: '', icp: '', problems: [], keywords: [], competitors: [], searchTerms: [], sources: [] }
}

function errorMessage(error: unknown) {
  const e = error as { data?: { statusMessage?: string }, statusMessage?: string }
  return e.data?.statusMessage ?? e.statusMessage ?? 'Something went wrong'
}

async function analyse() {
  analysing.value = true
  try {
    const res = await $fetch('/api/onboarding/extract', { method: 'POST', body: { url: url.value } })
    profile.value = {
      url: res.url,
      name: res.profile.product,
      category: res.profile.category,
      icp: res.profile.icp,
      problems: res.profile.problems_solved,
      keywords: res.profile.keywords,
      competitors: res.profile.competitors,
      searchTerms: res.profile.search_terms,
      sources: [],
    }
  }
  catch (error) {
    toast.error(errorMessage(error))
    profile.value = blank(/^https?:\/\//i.test(url.value) ? url.value : url.value && `https://${url.value}`)
  }
  finally {
    analysing.value = false
  }
}

async function save() {
  if (!profile.value) return
  saving.value = true
  try {
    const project = await $fetch('/api/projects', { method: 'POST', body: profile.value })
    await navigateTo(`/app/${project!.id}/today`)
  }
  catch (error) {
    if (!isPlanLimit(error)) toast.error(errorMessage(error))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">New project</h1>
      <p class="text-muted-foreground">Paste your product URL. We read the page and draft who your buyers are.</p>
    </div>

    <Card v-if="!profile">
      <CardContent>
        <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="analyse">
          <Input v-model="url" type="text" inputmode="url" placeholder="yourproduct.com" required class="flex-1" />
          <Button type="submit" :disabled="analysing">{{ analysing ? 'Reading page…' : 'Analyse' }}</Button>
        </form>
        <button class="mt-3 text-sm text-muted-foreground underline" @click="profile = blank()">
          Fill in manually instead
        </button>
      </CardContent>
    </Card>

    <form v-else class="flex flex-col gap-6" @submit.prevent="save">
      <Card>
        <CardHeader>
          <CardTitle>Check the profile</CardTitle>
          <CardDescription>Everything here drives the searches and scoring. Edit anything that's off.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectProfileForm v-model="profile" />
        </CardContent>
      </Card>
      <div class="flex gap-3">
        <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Create project' }}</Button>
        <Button type="button" variant="ghost" @click="profile = null">Start over</Button>
      </div>
    </form>
  </div>
</template>
