<script setup lang="ts">
import { toast } from 'vue-sonner'
import { authClient } from '~/lib/auth-client'

useHead({ title: 'Sign in · social-radar' })

const route = useRoute()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/app'
})

const { data: providers } = await useFetch('/api/auth-providers')

// Better Auth redirects OAuth failures back here with ?error=
onMounted(() => {
  const error = route.query.error
  if (typeof error === 'string') toast.error(error.replaceAll('_', ' ').toLowerCase())
})

const email = ref('')
const sending = ref(false)
const sentTo = ref<string | null>(null)

async function sendLink() {
  sending.value = true
  const { error } = await authClient.signIn.magicLink({
    email: email.value,
    callbackURL: redirect.value,
  })
  sending.value = false
  if (error) {
    toast.error(error.message ?? 'Could not send the link')
    return
  }
  sentTo.value = email.value
}

async function social(provider: 'github' | 'google') {
  const { error } = await authClient.signIn.social({
    provider,
    callbackURL: redirect.value,
    errorCallbackURL: '/login',
  })
  if (error) toast.error(error.message ?? 'Sign-in failed')
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
    <Card>
      <CardHeader>
        <CardTitle class="text-xl">Sign in</CardTitle>
        <CardDescription>Find the people who need your product.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div v-if="sentTo" class="rounded-md border bg-muted p-4 text-sm">
          Check <strong>{{ sentTo }}</strong> for a sign-in link.
          <button class="mt-2 block text-muted-foreground underline" @click="sentTo = null">
            Use a different email
          </button>
        </div>
        <form v-else class="flex flex-col gap-3" @submit.prevent="sendLink">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <Button type="submit" :disabled="sending">
            {{ sending ? 'Sending…' : 'Email me a sign-in link' }}
          </Button>
        </form>

        <template v-if="providers?.github || providers?.google">
          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator class="flex-1" /> or <Separator class="flex-1" />
          </div>
          <Button v-if="providers?.github" variant="outline" @click="social('github')">Continue with GitHub</Button>
          <Button v-if="providers?.google" variant="outline" @click="social('google')">Continue with Google</Button>
        </template>
      </CardContent>
    </Card>
  </main>
</template>
