<script setup lang="ts">
import { toast } from '@/lib/toast'

const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ imported: [string[]] }>()

const text = ref('')
const importing = ref(false)

async function submit() {
  importing.value = true
  try {
    const res = await $fetch(`/api/projects/${props.projectId}/subreddits/import`, { method: 'POST', body: { text: text.value } })
    if (res.added.length) {
      toast.success(`Watching ${res.added.length} subreddit${res.added.length === 1 ? '' : 's'}: ${res.added.slice(0, 5).map(n => `r/${n}`).join(', ')}${res.added.length > 5 ? '…' : ''}`)
      text.value = ''
      emit('imported', res.added)
    }
    if (res.limit) toast.info(`${res.limit.message} ${res.skipped.length} not added.`)
    else if (!res.added.length) toast.error(res.invalid.length ? `No valid subreddit names found (e.g. "${res.invalid[0]}").` : 'Paste at least one subreddit.')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not import'))
  }
  finally {
    importing.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-2" @submit.prevent="submit">
    <Textarea v-model="text" rows="3" placeholder="r/SaaS, r/startups, r/indiehackers&#10;…or one per line, or links" aria-label="Subreddits to watch" class="rounded-xl text-sm" />
    <div class="flex items-center gap-2">
      <Button type="submit" size="sm" :loading="importing" :disabled="!text.trim()">Watch these</Button>
      <span class="text-xs text-muted-foreground">Coming from GummySearch? Paste the subreddits from your audiences.</span>
    </div>
  </form>
</template>
