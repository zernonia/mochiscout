<script setup lang="ts">
import { MenuIcon } from '@lucide/vue'

useSeoMeta({ robots: 'noindex' })
// The app's mochi theme (assets/css/main.css), on <html> so overlays get it too.
useHead({ htmlAttrs: { class: 'theme-mochi' } })
const mobileOpen = ref(false)
</script>

<template>
  <div class="min-h-dvh bg-sidebar">
    <!-- Desktop sidebar -->
    <aside class="fixed inset-y-0 start-0 hidden w-64 bg-sidebar lg:block">
      <AppSidebar />
    </aside>

    <!-- Mobile top bar + drawer -->
    <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur lg:hidden">
      <Button variant="ghost" size="icon" aria-label="Open menu" @click="mobileOpen = true">
        <MenuIcon />
      </Button>
      <NuxtLink to="/app" class="flex items-center gap-1.5 font-semibold tracking-tight">
        <LandingMochiMascot :blink="false" outline class="h-5 w-7" />
        Mochiscout
      </NuxtLink>
    </header>
    <Sheet v-model:open="mobileOpen">
      <SheetContent side="left" class="w-72 bg-sidebar p-0" :show-close-button="false">
        <SheetTitle class="sr-only">Navigation</SheetTitle>
        <AppSidebar @navigate="mobileOpen = false" />
      </SheetContent>
    </Sheet>

    <div class="lg:ps-64">
      <main class="min-h-dvh bg-background lg:my-2 lg:me-2 lg:min-h-[calc(100dvh-1rem)] lg:rounded-xl lg:border lg:shadow-xs/5">
        <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <slot />
        </div>
      </main>
    </div>
    <UpgradeSheet />
  </div>
</template>
