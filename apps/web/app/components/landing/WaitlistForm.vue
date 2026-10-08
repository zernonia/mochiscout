<script setup lang="ts">
const props = defineProps<{ source: string }>()
const email = ref('')
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle')
const error = ref('')

async function submit() {
  state.value = 'sending'
  try {
    await $fetch('/api/waitlist', { method: 'POST', body: { email: email.value, source: props.source } })
    state.value = 'done'
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'Could not join the waitlist')
    state.value = 'error'
  }
}
</script>

<template>
  <p v-if="state === 'done'" class="rounded-md border bg-muted px-4 py-3 text-sm">You're on the list. We'll email you when your spot opens.</p>
  <form v-else class="flex w-full max-w-md flex-col gap-2 sm:flex-row" @submit.prevent="submit">
    <Input v-model="email" type="email" required placeholder="you@company.com" class="flex-1" aria-label="Email" />
    <Button type="submit" :disabled="state === 'sending'">{{ state === 'sending' ? 'Joining…' : 'Join the waitlist' }}</Button>
    <p v-if="state === 'error'" class="text-sm text-destructive sm:basis-full">{{ error }}</p>
  </form>
</template>
