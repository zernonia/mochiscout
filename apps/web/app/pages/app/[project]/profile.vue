<script setup lang="ts">
import type { ProjectProfile } from '~/components/ProjectProfileForm.vue'
import { IdCardIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = String(route.params.project)
// Lazy: the page renders at once with a skeleton; the form fills when the project arrives.
const { data: project, error } = useCachedFetch(() => `/api/projects/${projectId}`)
watch(error, (e) => { if (e) showError({ statusCode: 404, statusMessage: 'Project not found', fatal: true }) })
useHead({ title: () => `${project.value?.name ?? 'Project'} · Mochiscout` })

const form = ref<ProjectProfile | null>(null)
watch(project, (p) => {
  if (!p || form.value) return
  form.value = {
    url: p.url,
    name: p.name,
    category: p.category ?? '',
    icp: p.icp ?? '',
    problems: [...p.problems],
    keywords: [...p.keywords],
    competitors: [...p.competitors],
    searchTerms: [...p.searchTerms],
    sources: [...p.sources],
  }
}, { immediate: true })
const saving = ref(false)

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    await $fetch<unknown>(`/api/projects/${projectId}` as string, { method: 'PATCH', body: form.value })
    toast.success('Profile saved')
  }
  catch (e) {
    if (!isPlanLimit(e)) toast.error(apiErrorMessage(e, 'Could not save'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-8">
    <AppPageHeader title="Project profile" description="What we know about your product. Keywords and search terms decide which threads match, so keep them in your buyers' words." :icon="IdCardIcon" />
    <SkeletonCards v-if="!project || !form" :count="3" :lines="3" />
    <template v-else>
      <form class="flex flex-col gap-8" @submit.prevent="save">
        <ProjectProfileForm v-model="form" layout="sections" />
        <div class="grid md:grid-cols-[14rem_1fr] md:gap-8">
          <div class="max-md:hidden" />
          <div>
            <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save profile' }}</Button>
          </div>
        </div>
      </form>
      <Separator class="opacity-60" />
      <!-- Separate form: nested forms break hydration. -->
      <ReplyInstructionsCard :project-id="projectId" :product-name="project.name" />
      <AlertWebhookCard :project-id="projectId" :initial-url="project.alertWebhookUrl" />
    </template>
  </div>
</template>
