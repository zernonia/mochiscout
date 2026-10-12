<script setup lang="ts">
import type { ProjectProfile } from '~/components/ProjectProfileForm.vue'
import { toast } from '@/lib/toast'

definePageMeta({ layout: 'app' })

const route = useRoute()
const projectId = String(route.params.project)
const { data: project, error } = await useFetch(() => `/api/projects/${projectId}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
useHead({ title: () => `${project.value?.name ?? 'Project'} · Mochiscout` })

const form = ref<ProjectProfile>({
  url: project.value!.url,
  name: project.value!.name,
  category: project.value!.category ?? '',
  icp: project.value!.icp ?? '',
  problems: [...project.value!.problems],
  keywords: [...project.value!.keywords],
  competitors: [...project.value!.competitors],
  searchTerms: [...project.value!.searchTerms],
  sources: [...project.value!.sources],
})
const saving = ref(false)

async function save() {
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
  <div v-if="project" class="flex flex-col gap-5">
    <AppPageHeader title="Project profile" description="What we know about your product. Keywords and search terms decide which threads match, so keep them in your buyers' words." />
    <form class="flex flex-col gap-5" @submit.prevent="save">
      <Card>
        <CardContent>
          <ProjectProfileForm v-model="form" />
        </CardContent>
      </Card>
      <div>
        <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save profile' }}</Button>
      </div>
    </form>
    <!-- Separate form: nested forms break hydration. -->
    <ReplyInstructionsCard :project-id="projectId" :product-name="project.name" />
    <AlertWebhookCard :project-id="projectId" :initial-url="project.alertWebhookUrl" />
  </div>
</template>
