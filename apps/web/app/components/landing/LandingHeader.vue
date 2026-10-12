<template>
  <header class="sticky top-3 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between rounded-full border bg-background/80 py-1.5 ps-4 pe-1.5 shadow-sm backdrop-blur">
    <NuxtLink to="/" class="flex items-center gap-1.5 font-semibold tracking-tight">
      <LandingMochiMascot :blink="false" outline class="h-5 w-7" />
      Mochiscout
    </NuxtLink>
    <nav class="flex items-center gap-1 text-sm">
      <Button as-child variant="ghost" size="sm" class="hidden rounded-full sm:inline-flex"><NuxtLink to="/#pricing">Pricing</NuxtLink></Button>
      <Button as-child variant="ghost" size="sm" class="hidden rounded-full sm:inline-flex"><NuxtLink to="/alternatives">Compare</NuxtLink></Button>
      <Button as-child variant="ghost" size="sm" class="hidden rounded-full sm:inline-flex"><NuxtLink to="/tools">Free tools</NuxtLink></Button>
      <Button as-child variant="ghost" size="sm" class="rounded-full"><NuxtLink to="/login">Sign in</NuxtLink></Button>
      <Button as-child size="sm" class="rounded-full"><NuxtLink to="/login">Start free</NuxtLink></Button>
    </nav>
  </header>
</template>
