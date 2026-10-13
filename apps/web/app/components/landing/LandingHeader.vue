<script setup lang="ts">
import { MenuIcon, XIcon } from '@lucide/vue'
import { useWindowScroll } from '@vueuse/core'

const links = [
  { label: 'How it works', to: '/#how' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Compare', to: '/alternatives' },
  { label: 'Free tools', to: '/tools' },
]

const { y } = useWindowScroll()
const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
// The bar is see-through at the top of the page and solid once content scrolls under it.
const solid = computed(() => open.value || y.value > 8)
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b transition-colors duration-200"
    :class="open ? 'border-border bg-background' : solid ? 'border-border bg-background/85 backdrop-blur-md' : 'border-transparent'"
  >
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight">
        <LandingMochiMascot lively :blink="false" outline class="h-5 w-7" />
        Mochiscout
      </NuxtLink>

      <nav class="hidden items-center gap-1 text-sm whitespace-nowrap text-muted-foreground lg:flex" aria-label="Main">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded-full px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <div class="ms-auto flex items-center gap-1.5">
        <a
          :href="site.repo"
          target="_blank"
          rel="noopener"
          class="hidden h-8 items-center gap-1.5 rounded-full border whitespace-nowrap bg-background px-3 text-sm font-medium shadow-xs/5 transition-colors hover:bg-muted sm:inline-flex"
        >
          <GitHubMark class="size-4" /> GitHub
        </a>
        <NuxtLink to="/login" class="hidden rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted sm:inline-flex">
          Sign in
        </NuxtLink>
        <Button as-child size="sm" class="rounded-full bg-brand px-4 text-white shadow-sm shadow-brand/25 hover:bg-brand/90">
          <NuxtLink to="/login?mode=signup">Try Pro free</NuxtLink>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="rounded-full lg:hidden"
          :aria-label="open ? 'Close menu' : 'Open menu'"
          :aria-expanded="open"
          aria-controls="landing-menu"
          @click="open = !open"
        >
          <XIcon v-if="open" />
          <MenuIcon v-else />
        </Button>
      </div>
    </div>

    <nav v-if="open" id="landing-menu" class="border-t px-4 pt-2 pb-5 lg:hidden" aria-label="Main">
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="block rounded-xl px-3 py-2.5 text-[15px] font-medium hover:bg-muted">
        {{ l.label }}
      </NuxtLink>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <Button as-child variant="outline" class="rounded-full">
          <a :href="site.repo" target="_blank" rel="noopener"><GitHubMark /> GitHub</a>
        </Button>
        <Button as-child variant="outline" class="rounded-full">
          <NuxtLink to="/login">Sign in</NuxtLink>
        </Button>
      </div>
    </nav>
  </header>
</template>
