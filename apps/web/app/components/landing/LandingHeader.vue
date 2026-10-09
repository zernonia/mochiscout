<template>
  <header class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
    <NuxtLink to="/" class="font-semibold tracking-tight">Mochiscout</NuxtLink>
    <nav class="flex items-center gap-1 text-sm">
      <Button as-child variant="ghost" size="sm"><NuxtLink to="/#pricing">Pricing</NuxtLink></Button>
      <Button as-child variant="ghost" size="sm"><NuxtLink to="/login">Sign in</NuxtLink></Button>
    </nav>
  </header>
</template>
