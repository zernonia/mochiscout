<script setup lang="ts">
import { toast } from '@/lib/toast'

useHead({ title: 'Sign in · Mochiscout' })
useNoIndex()

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/app'
})

const { data: providers } = await useFetch('/api/auth-providers')

const mode = ref<'signin' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'signin')
const { edition } = useRuntimeConfig().public
const form = reactive({ email: '', password: '' })
const busy = ref(false)

// OAuth failures come back as ?error=
onMounted(() => {
  if (typeof route.query.error === 'string') toast.error(route.query.error)
})

async function submit() {
  busy.value = true
  try {
    await $fetch(mode.value === 'signin' ? '/api/auth/login' : '/api/auth/signup', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo(redirect.value)
  }
  catch (error) {
    toast.error(apiErrorMessage(error, mode.value === 'signin' ? 'Could not sign in' : 'Could not create the account'))
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
    <Card>
      <CardHeader>
        <CardTitle class="text-xl">{{ mode === 'signin' ? 'Sign in' : edition === 'cloud' ? 'Start your free Pro trial' : 'Create your account' }}</CardTitle>
        <CardDescription>
          {{ mode === 'signup' && edition === 'cloud' ? '14 days of Pro, no card. Paste your URL next and see people asking for your product in a few minutes.' : 'Find the people who need your product.' }}
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <template v-if="providers?.github || providers?.google">
          <Button v-if="providers?.github" as-child variant="outline">
            <a href="/auth/github">Continue with GitHub</a>
          </Button>
          <Button v-if="providers?.google" as-child variant="outline">
            <a href="/auth/google">Continue with Google</a>
          </Button>
          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator class="flex-1" /> or <Separator class="flex-1" />
          </div>
        </template>

        <form class="flex flex-col gap-3" @submit.prevent="submit">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
              :minlength="mode === 'signup' ? 8 : undefined"
              required
            />
            <p v-if="mode === 'signup'" class="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <Button type="submit" class="bg-brand text-white hover:bg-brand/90" :disabled="busy">
            {{ busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
          </Button>
        </form>

        <button type="button" class="text-sm text-muted-foreground underline" @click="mode = mode === 'signin' ? 'signup' : 'signin'">
          {{ mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in' }}
        </button>
      </CardContent>
    </Card>
  </main>
</template>
